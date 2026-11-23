-- Initial schema and row-level security policies for the Katinat guest Wi-Fi project.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  full_name text,
  gender text CHECK (gender IN ('male', 'female', 'other', 'undisclosed')),
  age_group text CHECK (age_group IN ('under_18', '18_24', '25_34', '35_44', '45_54', '55_plus', 'undisclosed')),
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  device_fingerprint text NOT NULL,
  device_type text NOT NULL DEFAULT 'unknown' CHECK (device_type IN ('iphone', 'android', 'laptop', 'tablet', 'unknown')),
  user_agent text,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  address text NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.hotspots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations (id) ON DELETE CASCADE,
  name text NOT NULL,
  ssid text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, ssid)
);

CREATE TABLE public.wifi_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES public.devices (id) ON DELETE CASCADE,
  hotspot_id uuid NOT NULL REFERENCES public.hotspots (id) ON DELETE RESTRICT,
  login_method text NOT NULL CHECK (login_method IN ('google', 'facebook', 'email')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  last_seen timestamptz NOT NULL DEFAULT now(),
  download_bytes bigint CHECK (download_bytes IS NULL OR download_bytes >= 0),
  upload_bytes bigint CHECK (upload_bytes IS NULL OR upload_bytes >= 0),
  status text NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'expired')),
  end_reason text
);

CREATE TABLE public.marketing_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  consented boolean NOT NULL,
  source text NOT NULL,
  consent_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  html_content text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE TABLE public.email_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns (id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.email_recipients (id) ON DELETE CASCADE,
  provider_message_id text,
  status text NOT NULL,
  sent_at timestamptz
);

CREATE TABLE public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (discount_type <> 'percent' OR discount_value <= 100)
);

CREATE TABLE public.voucher_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id uuid NOT NULL REFERENCES public.vouchers (id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (voucher_id, customer_id)
);

-- Indexes support customer history, online-session monitoring, consent history, and campaign queues.
CREATE INDEX wifi_sessions_customer_started_at_idx
  ON public.wifi_sessions (customer_id, started_at DESC);
CREATE INDEX wifi_sessions_online_idx
  ON public.wifi_sessions (status) WHERE status = 'online';
CREATE INDEX marketing_consents_customer_created_at_idx
  ON public.marketing_consents (customer_id, created_at DESC);
CREATE INDEX email_recipients_campaign_status_idx
  ON public.email_recipients (campaign_id, status);
-- Required by the session API upsert and to prevent duplicate online device sessions.
CREATE UNIQUE INDEX devices_customer_fingerprint_unique
  ON public.devices (customer_id, device_fingerprint);
CREATE UNIQUE INDEX wifi_sessions_one_online_per_device_unique
  ON public.wifi_sessions (device_id)
  WHERE status = 'online';
-- UNIQUE(code) above creates the btree index used for voucher code lookups.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS is enabled on every application table; writes without an explicit policy remain unavailable to clients.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotspots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wifi_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;

-- Profiles: customers can read their own row and update their own profile fields.
-- Column grants below prevent customers from changing role; administrators can read/update/delete all rows.
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));
CREATE POLICY profiles_select_admin ON public.profiles
  FOR SELECT TO authenticated USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY profiles_delete_admin ON public.profiles
  FOR DELETE TO authenticated USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Devices: customers can read their own devices; administrators can read/update/delete all devices.
CREATE POLICY devices_select_own ON public.devices
  FOR SELECT TO authenticated USING (customer_id = (SELECT auth.uid()));
CREATE POLICY devices_select_admin ON public.devices
  FOR SELECT TO authenticated USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY devices_update_admin ON public.devices
  FOR UPDATE TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY devices_delete_admin ON public.devices
  FOR DELETE TO authenticated USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Locations and hotspots are admin-readable/manageable; provisioning writes use the service role.
CREATE POLICY locations_select_admin ON public.locations
  FOR SELECT TO authenticated USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY locations_update_admin ON public.locations
  FOR UPDATE TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY locations_delete_admin ON public.locations
  FOR DELETE TO authenticated USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY hotspots_select_admin ON public.hotspots
  FOR SELECT TO authenticated USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY hotspots_update_admin ON public.hotspots
  FOR UPDATE TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY hotspots_delete_admin ON public.hotspots
  FOR DELETE TO authenticated USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Wi-Fi sessions: customers can read their own history; inserts are only available through trusted server code.
CREATE POLICY wifi_sessions_select_own ON public.wifi_sessions
  FOR SELECT TO authenticated USING (customer_id = (SELECT auth.uid()));
CREATE POLICY wifi_sessions_select_admin ON public.wifi_sessions
  FOR SELECT TO authenticated USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY wifi_sessions_update_admin ON public.wifi_sessions
  FOR UPDATE TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY wifi_sessions_delete_admin ON public.wifi_sessions
  FOR DELETE TO authenticated USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Consent records are append-only from server routes; customers and admins can read according to ownership/role.
CREATE POLICY marketing_consents_select_own ON public.marketing_consents
  FOR SELECT TO authenticated USING (customer_id = (SELECT auth.uid()));
CREATE POLICY marketing_consents_select_admin ON public.marketing_consents
  FOR SELECT TO authenticated USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY marketing_consents_update_admin ON public.marketing_consents
  FOR UPDATE TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY marketing_consents_delete_admin ON public.marketing_consents
  FOR DELETE TO authenticated USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Campaign and delivery records, vouchers, and redemptions are admin-readable only.
-- No client write grants or write policies are defined; trusted server code uses the service role.
CREATE POLICY email_campaigns_select_admin ON public.email_campaigns
  FOR SELECT TO authenticated USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY email_recipients_select_admin ON public.email_recipients
  FOR SELECT TO authenticated USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY email_logs_select_admin ON public.email_logs
  FOR SELECT TO authenticated USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY vouchers_select_admin ON public.vouchers
  FOR SELECT TO authenticated USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY voucher_redemptions_select_admin ON public.voucher_redemptions
  FOR SELECT TO authenticated USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Table grants complement RLS. There is no anon access and no authenticated INSERT policy.
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
REVOKE ALL ON TABLE
  public.profiles, public.devices, public.locations, public.hotspots,
  public.wifi_sessions, public.marketing_consents, public.email_campaigns,
  public.email_recipients, public.email_logs, public.vouchers,
  public.voucher_redemptions
FROM PUBLIC, anon, authenticated;

GRANT SELECT, DELETE ON public.profiles TO authenticated;
GRANT UPDATE (email, full_name, gender, age_group) ON public.profiles TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.devices, public.locations, public.hotspots,
  public.wifi_sessions, public.marketing_consents TO authenticated;
GRANT SELECT ON public.email_campaigns, public.email_recipients, public.email_logs,
  public.vouchers, public.voucher_redemptions TO authenticated;

GRANT ALL PRIVILEGES ON TABLE
  public.profiles, public.devices, public.locations, public.hotspots,
  public.wifi_sessions, public.marketing_consents, public.email_campaigns,
  public.email_recipients, public.email_logs, public.vouchers,
  public.voucher_redemptions
TO service_role;
