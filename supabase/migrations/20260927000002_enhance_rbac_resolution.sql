-- =====================================================================
-- ENHANCED RBAC RESOLUTION & PROFILES PERMISSION UPGRADE
-- =====================================================================
-- 1. Upgrade public.current_user_role() to check public.profiles first as
--    security definer, ensuring immediate RLS elevation when roles change.
-- 2. Upgrade public.current_user_branch_id() to check public.profiles first.
-- 3. Add missing INSERT and DELETE RLS policies on public.profiles.
-- =====================================================================

create or replace function public.current_user_role()
returns text
language plpgsql
security definer
stable
as $$
declare
    _role text;
begin
    -- 1. Check direct profile assignment in public.profiles (source of truth)
    select role into _role from public.profiles where id = auth.uid() and is_active = true;
    if _role is not null then
        return _role;
    end if;

    -- 2. Fall back to JWT app_metadata if profile not yet queried
    _role := auth.jwt() -> 'app_metadata' ->> 'role';
    if _role is not null then
        return _role;
    end if;

    return 'cashier';
end;
$$;

create or replace function public.current_user_branch_id()
returns uuid
language plpgsql
security definer
stable
as $$
declare
    _branch_id uuid;
begin
    -- 1. Check direct profile assignment in public.profiles
    select branch_id into _branch_id from public.profiles where id = auth.uid() and is_active = true;
    if _branch_id is not null then
        return _branch_id;
    end if;

    -- 2. Fall back to JWT app_metadata
    return (auth.jwt() -> 'app_metadata' ->> 'branch_id')::uuid;
end;
$$;

-- Allow authenticated users to insert their own profile upon initial sign-in,
-- or Super Admins to insert any staff profile
do $$
begin
    if not exists (
        select 1 from pg_policies 
        where tablename = 'profiles' and policyname = 'profiles_insert'
    ) then
        create policy "profiles_insert" on public.profiles
            for insert to authenticated
            with check (
                (select auth.uid()) = id
                or public.current_user_role() = 'super_admin'
            );
    end if;
end $$;

-- Allow Super Admins to remove or delete staff records
do $$
begin
    if not exists (
        select 1 from pg_policies 
        where tablename = 'profiles' and policyname = 'profiles_delete'
    ) then
        create policy "profiles_delete" on public.profiles
            for delete to authenticated
            using (public.current_user_role() = 'super_admin');
    end if;
end $$;
