-- Enable pg_cron in Supabase Dashboard under Database -> Extensions before running this migration.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- One browser fingerprint maps to one device row for each customer.
CREATE UNIQUE INDEX IF NOT EXISTS devices_customer_fingerprint_unique
  ON public.devices (customer_id, device_fingerprint);

-- Prevent concurrent session requests from opening two online sessions for the same device.
CREATE UNIQUE INDEX IF NOT EXISTS wifi_sessions_one_online_per_device_unique
  ON public.wifi_sessions (device_id)
  WHERE status = 'online';

-- Expire sessions without a heartbeat for five minutes. The named job can be safely re-run.
SELECT cron.schedule(
  'wifi-session-timeout-cleanup',
  '*/5 * * * *',
  $job$
    UPDATE public.wifi_sessions
    SET status = 'offline',
        ended_at = last_seen,
        end_reason = 'timeout'
    WHERE status = 'online'
      AND last_seen < now() - interval '5 minutes';
  $job$
);
