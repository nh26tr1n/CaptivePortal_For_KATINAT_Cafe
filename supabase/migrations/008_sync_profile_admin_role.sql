-- Keep the trusted JWT role claim aligned with the authoritative profile role.
-- Existing RLS policies and SECURITY DEFINER analytics functions use this claim.
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  UPDATE auth.users AS auth_user
  SET raw_app_meta_data = COALESCE(auth_user.raw_app_meta_data, '{}'::jsonb)
    || pg_catalog.jsonb_build_object('role', NEW.role)
  WHERE auth_user.id = NEW.id;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_profile_role_to_auth_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_sync_auth_role ON public.profiles;
DROP TRIGGER IF EXISTS profiles_sync_auth_role_update ON public.profiles;
CREATE TRIGGER profiles_sync_auth_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role_to_auth_user();

CREATE TRIGGER profiles_sync_auth_role_update
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role_to_auth_user();

UPDATE auth.users AS auth_user
SET raw_app_meta_data = COALESCE(auth_user.raw_app_meta_data, '{}'::jsonb)
  || pg_catalog.jsonb_build_object('role', profile.role)
FROM public.profiles AS profile
WHERE auth_user.id = profile.id
  AND auth_user.raw_app_meta_data ->> 'role' IS DISTINCT FROM profile.role;
