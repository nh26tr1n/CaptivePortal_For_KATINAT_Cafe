-- This invoker-security view reads data through the calling admin's RLS policies.
CREATE OR REPLACE VIEW public.admin_customer_overview
WITH (security_invoker = true)
AS
SELECT
  profile.id,
  profile.email,
  profile.full_name,
  profile.gender,
  profile.age_group,
  profile.created_at AS registered_at,
  session_summary.latest_login_method,
  session_summary.last_visit_at,
  session_summary.total_sessions,
  session_summary.total_duration_min,
  latest_consent.consented AS marketing_consented,
  session_summary.total_sessions > 1 AS is_returning
FROM public.profiles AS profile
LEFT JOIN LATERAL (
  SELECT
    pg_catalog.count(*)::integer AS total_sessions,
    CASE
      WHEN pg_catalog.count(*) = 0 THEN NULL::numeric
      ELSE pg_catalog.round(
        pg_catalog.sum(EXTRACT(epoch FROM (COALESCE(session.ended_at, session.last_seen) - session.started_at)) / 60)::numeric,
        2
      )
    END AS total_duration_min,
    (pg_catalog.array_agg(session.login_method ORDER BY session.started_at DESC))[1] AS latest_login_method,
    pg_catalog.max(session.last_seen) AS last_visit_at
  FROM public.wifi_sessions AS session
  WHERE session.customer_id = profile.id
) AS session_summary ON true
LEFT JOIN LATERAL (
  SELECT consent.consented
  FROM public.marketing_consents AS consent
  WHERE consent.customer_id = profile.id
  ORDER BY consent.created_at DESC, consent.id DESC
  LIMIT 1
) AS latest_consent ON true
WHERE profile.role = 'customer';

GRANT SELECT ON public.admin_customer_overview TO authenticated;

-- Dashboard duration uses SQL aggregation rather than transferring every session to the server.
CREATE OR REPLACE FUNCTION public.get_dashboard_total_duration(from_ts timestamptz, to_ts timestamptz)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  total_duration numeric;
BEGIN
  IF NOT COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF from_ts IS NULL OR to_ts IS NULL OR from_ts >= to_ts THEN
    RAISE EXCEPTION 'from_ts must be earlier than to_ts' USING ERRCODE = '22023';
  END IF;

  SELECT CASE
    WHEN pg_catalog.count(*) = 0 THEN NULL::numeric
    ELSE pg_catalog.round(
      pg_catalog.sum(EXTRACT(epoch FROM (COALESCE(session.ended_at, session.last_seen) - session.started_at)) / 60)::numeric,
      2
    )
  END
  INTO total_duration
  FROM public.wifi_sessions AS session
  WHERE session.started_at >= from_ts AND session.started_at < to_ts;

  RETURN total_duration;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_dashboard_total_duration(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_total_duration(timestamptz, timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_session_time_by_date(from_ts timestamptz, to_ts timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF from_ts IS NULL OR to_ts IS NULL OR from_ts >= to_ts THEN
    RAISE EXCEPTION 'from_ts must be earlier than to_ts' USING ERRCODE = '22023';
  END IF;

  WITH daily_totals AS (
    SELECT (session.started_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day,
           pg_catalog.round(
             pg_catalog.sum(EXTRACT(epoch FROM (COALESCE(session.ended_at, session.last_seen) - session.started_at)) / 60)::numeric,
             2
           ) AS total_minutes
    FROM public.wifi_sessions AS session
    WHERE session.started_at >= from_ts AND session.started_at < to_ts
    GROUP BY 1
  ), day_series AS (
    SELECT generated_day::date AS day
    FROM pg_catalog.generate_series(
      ((from_ts AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::timestamp,
      (((to_ts - interval '1 microsecond') AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::timestamp,
      interval '1 day'
    ) AS days(generated_day)
  )
  SELECT COALESCE(pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'date', pg_catalog.to_char(day_series.day, 'YYYY-MM-DD'),
      'minutes', COALESCE(daily_totals.total_minutes, 0)
    ) ORDER BY day_series.day
  ), '[]'::jsonb)
  INTO result
  FROM day_series
  LEFT JOIN daily_totals USING (day);

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_new_vs_returning(from_ts timestamptz, to_ts timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF from_ts IS NULL OR to_ts IS NULL OR from_ts >= to_ts THEN
    RAISE EXCEPTION 'from_ts must be earlier than to_ts' USING ERRCODE = '22023';
  END IF;

  WITH current_guests AS (
    SELECT DISTINCT session.customer_id,
           EXISTS (
             SELECT 1 FROM public.wifi_sessions AS previous_session
             WHERE previous_session.customer_id = session.customer_id
               AND previous_session.started_at < from_ts
           ) AS is_returning
    FROM public.wifi_sessions AS session
    WHERE session.started_at >= from_ts AND session.started_at < to_ts
  )
  SELECT pg_catalog.jsonb_build_object(
    'new_guests', pg_catalog.count(*) FILTER (WHERE is_returning IS FALSE)::integer,
    'returning_guests', pg_catalog.count(*) FILTER (WHERE is_returning IS TRUE)::integer
  ) INTO result
  FROM current_guests;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_login_method_distribution(from_ts timestamptz, to_ts timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF from_ts IS NULL OR to_ts IS NULL OR from_ts >= to_ts THEN
    RAISE EXCEPTION 'from_ts must be earlier than to_ts' USING ERRCODE = '22023';
  END IF;

  SELECT pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object('method', methods.method, 'count', COALESCE(counts.session_count, 0))
    ORDER BY methods.sort_order
  ) INTO result
  FROM (VALUES ('google', 1), ('facebook', 2), ('email', 3)) AS methods(method, sort_order)
  LEFT JOIN (
    SELECT session.login_method AS method, pg_catalog.count(*)::integer AS session_count
    FROM public.wifi_sessions AS session
    WHERE session.started_at >= from_ts AND session.started_at < to_ts
    GROUP BY session.login_method
  ) AS counts USING (method);

  RETURN COALESCE(result, '[]'::jsonb);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_session_time_by_date(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_new_vs_returning(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_login_method_distribution(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_session_time_by_date(timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_new_vs_returning(timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_login_method_distribution(timestamptz, timestamptz) TO authenticated, service_role;
