-- Ensure session upserts and one-online-session checks work on databases
-- that were created before these constraints were added to the initial migration.
CREATE UNIQUE INDEX IF NOT EXISTS devices_customer_fingerprint_unique
  ON public.devices (customer_id, device_fingerprint);

CREATE UNIQUE INDEX IF NOT EXISTS wifi_sessions_one_online_per_device_unique
  ON public.wifi_sessions (device_id)
  WHERE status = 'online';
