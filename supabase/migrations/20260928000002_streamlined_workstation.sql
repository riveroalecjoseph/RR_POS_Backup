-- =====================================================================
-- MIGRATION: Streamlined Workstation, user_profiles alias, and has_discrepancy
-- =====================================================================

-- 1. Ensure has_discrepancy column exists on public.transfers
ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS has_discrepancy boolean DEFAULT false;

-- 2. Create or replace view public.user_profiles as alias of public.profiles
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
    id,
    email,
    full_name,
    role,
    branch_id,
    is_active,
    must_change_password,
    created_at,
    updated_at
FROM public.profiles;

-- 3. Ensure INSERT / UPDATE policies on profiles for authenticated super_admins and new sign-ups
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Allow auth users to insert own profile or admin insert'
    ) THEN
        CREATE POLICY "Allow auth users to insert own profile or admin insert"
            ON public.profiles FOR INSERT
            TO authenticated
            WITH CHECK (
                auth.uid() = id OR 
                public.current_user_role() = 'super_admin' OR
                auth.jwt() ->> 'email' = 'riveroalecjoseph@gmail.com'
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Allow super admin full update on profiles'
    ) THEN
        CREATE POLICY "Allow super admin full update on profiles"
            ON public.profiles FOR UPDATE
            TO authenticated
            USING (
                auth.uid() = id OR 
                public.current_user_role() = 'super_admin' OR
                auth.jwt() ->> 'email' = 'riveroalecjoseph@gmail.com'
            );
    END IF;
END $$;
