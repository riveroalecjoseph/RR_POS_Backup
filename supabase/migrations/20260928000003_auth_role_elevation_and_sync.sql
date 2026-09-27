-- =====================================================================
-- MIGRATION: Auth Role Elevation, Dynamic Sync, and New User Trigger
-- Ensures seamless role synchronization between auth.users and public.profiles
-- =====================================================================

-- 1. Automatic profile provisioning trigger for new Supabase Auth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _meta_role text;
    _resolved_role text;
    _full_name text;
    _branch_id uuid;
BEGIN
    -- Check role in app_metadata first, then user_metadata
    _meta_role := COALESCE(
        new.raw_app_meta_data ->> 'role',
        new.raw_user_meta_data ->> 'role'
    );

    IF LOWER(new.email) = 'riveroalecjoseph@gmail.com' OR _meta_role = 'super_admin' THEN
        _resolved_role := 'super_admin';
    ELSIF _meta_role IN ('branch_manager', 'inventory_manager') THEN
        _resolved_role := 'branch_manager';
    ELSE
        _resolved_role := 'cashier';
    END IF;

    _full_name := COALESCE(
        new.raw_user_meta_data ->> 'full_name',
        split_part(new.email, '@', 1)
    );

    IF _resolved_role <> 'super_admin' AND (new.raw_user_meta_data ->> 'branch_id') IS NOT NULL THEN
        BEGIN
            _branch_id := (new.raw_user_meta_data ->> 'branch_id')::uuid;
        EXCEPTION WHEN OTHERS THEN
            _branch_id := NULL;
        END;
    ELSE
        _branch_id := NULL;
    END IF;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        branch_id,
        is_active,
        created_at,
        updated_at
    )
    VALUES (
        new.id,
        LOWER(new.email),
        _full_name,
        _resolved_role,
        _branch_id,
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        role = CASE 
            WHEN public.profiles.role = 'super_admin' THEN 'super_admin'
            ELSE EXCLUDED.role 
        END,
        updated_at = NOW();

    RETURN new;
END;
$$;

-- Drop existing trigger if it exists and attach to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();


-- 2. Metadata change sync trigger: updates public.profiles if auth metadata changes
CREATE OR REPLACE FUNCTION public.handle_user_metadata_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _new_role text;
BEGIN
    _new_role := COALESCE(
        new.raw_app_meta_data ->> 'role',
        new.raw_user_meta_data ->> 'role'
    );

    IF _new_role IS NOT NULL AND _new_role IN ('super_admin', 'branch_manager', 'cashier') THEN
        UPDATE public.profiles
        SET 
            role = _new_role,
            branch_id = CASE WHEN _new_role = 'super_admin' THEN NULL ELSE branch_id END,
            updated_at = NOW()
        WHERE id = new.id;
    END IF;

    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_metadata_updated ON auth.users;
CREATE TRIGGER on_auth_user_metadata_updated
    AFTER UPDATE OF raw_app_meta_data, raw_user_meta_data ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_metadata_update();


-- 3. Upgrade current_user_role() function to inspect all metadata layers
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    _role text;
    _jwt jsonb;
BEGIN
    _jwt := auth.jwt();

    -- Check direct profile assignment in public.profiles (source of truth)
    SELECT role INTO _role FROM public.profiles WHERE id = auth.uid() AND is_active = true;
    IF _role IS NOT NULL THEN
        RETURN _role;
    END IF;

    -- Check JWT app_metadata
    _role := _jwt -> 'app_metadata' ->> 'role';
    IF _role IS NOT NULL THEN
        RETURN _role;
    END IF;

    -- Check JWT user_metadata
    _role := _jwt -> 'user_metadata' ->> 'role';
    IF _role IS NOT NULL THEN
        RETURN _role;
    END IF;

    -- Hardcoded root owner check in JWT email
    IF (_jwt ->> 'email') = 'riveroalecjoseph@gmail.com' THEN
        RETURN 'super_admin';
    END IF;

    RETURN 'cashier';
END;
$$;
