-- Analytics functions run with the function owner's privileges. Each function enforces
-- an admin app_metadata claim or the trusted service_role claim before reading data.

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(from_ts timestamptz, to_ts timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT (COALESCE(auth.role() = 'service_role', false)
      OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF from_ts IS NULL OR to_ts IS NULL OR from_ts >= to_ts THEN
    RAISE EXCEPTION 'from_ts must be earlier than to_ts' USING ERRCODE = '22023';
  END IF;

  WITH interval_sessions AS (
    SELECT s.*
    FROM public.wifi_sessions AS s
    WHERE s.started_at >= from_ts AND s.started_at < to_ts
  ),
  daily_counts AS (
    SELECT (s.started_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS local_day,
           pg_catalog.count(*)::integer AS session_count
    FROM interval_sessions AS s
    GROUP BY 1
  ),
  daily_series AS (
    SELECT generated_day::date AS local_day
    FROM pg_catalog.generate_series(
      ((from_ts AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::timestamp,
      (((to_ts - interval '1 microsecond') AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::timestamp,
      interval '1 day'
    ) AS days(generated_day)
  ),
  returning_guests_cte AS (
    SELECT pg_catalog.count(DISTINCT current_period.customer_id)::integer AS guest_count
    FROM interval_sessions AS current_period
    WHERE EXISTS (
      SELECT 1
      FROM public.wifi_sessions AS earlier
      WHERE earlier.customer_id = current_period.customer_id
        AND earlier.started_at < from_ts
    )
  ),
  latest_consents AS (
    SELECT DISTINCT ON (consent.customer_id) consent.customer_id, consent.consented
    FROM public.marketing_consents AS consent
    JOIN public.profiles AS profile ON profile.id = consent.customer_id AND profile.role = 'customer'
    ORDER BY consent.customer_id, consent.created_at DESC, consent.id DESC
  )
  SELECT pg_catalog.jsonb_build_object(
    'total_sessions', (SELECT pg_catalog.count(*)::integer FROM interval_sessions),
    'unique_guests', (SELECT pg_catalog.count(DISTINCT customer_id)::integer FROM interval_sessions),
    'avg_duration_min', (
      SELECT pg_catalog.round(
        pg_catalog.avg(EXTRACT(epoch FROM (COALESCE(ended_at, last_seen) - started_at)) / 60)::numeric,
        2
      )
      FROM interval_sessions
    ),
    'daily_sessions', COALESCE((
      SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'date', pg_catalog.to_char(series.local_day, 'YYYY-MM-DD'),
          'count', COALESCE(counts.session_count, 0)
        ) ORDER BY series.local_day
      )
      FROM daily_series AS series
      LEFT JOIN daily_counts AS counts USING (local_day)
    ), '[]'::jsonb),
    'online_now', (
      SELECT pg_catalog.count(*)::integer
      FROM public.wifi_sessions AS online_session
      WHERE online_session.status = 'online'
    ),
    'returning_guests', (SELECT guest_count FROM returning_guests_cte),
    'marketing_subscribers', (
      SELECT pg_catalog.count(*)::integer FROM latest_consents WHERE consented IS TRUE
    )
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_demographics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT (COALESCE(auth.role() = 'service_role', false)
      OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;

  SELECT pg_catalog.jsonb_build_object(
    'gender_distribution', (
      SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object('gender', category.gender, 'count', COALESCE(actuals.count, 0))
        ORDER BY category.sort_order
      )
      FROM (VALUES
        ('male', 1), ('female', 2), ('other', 3), ('undisclosed', 4)
      ) AS category(gender, sort_order)
      LEFT JOIN (
        SELECT COALESCE(profile.gender, 'undisclosed') AS gender, pg_catalog.count(*)::integer AS count
        FROM public.profiles AS profile
        WHERE profile.role = 'customer'
        GROUP BY 1
      ) AS actuals ON actuals.gender = category.gender
    ),
    'age_distribution', (
      SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object('age_group', category.age_group, 'count', COALESCE(actuals.count, 0))
        ORDER BY category.sort_order
      )
      FROM (VALUES
        ('under_18', 1), ('18_24', 2), ('25_34', 3), ('35_44', 4),
        ('45_54', 5), ('55_plus', 6), ('undisclosed', 7)
      ) AS category(age_group, sort_order)
      LEFT JOIN (
        SELECT COALESCE(profile.age_group, 'undisclosed') AS age_group, pg_catalog.count(*)::integer AS count
        FROM public.profiles AS profile
        WHERE profile.role = 'customer'
        GROUP BY 1
      ) AS actuals ON actuals.age_group = category.age_group
    )
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_peak_hours(from_ts timestamptz, to_ts timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT (COALESCE(auth.role() = 'service_role', false)
      OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF from_ts IS NULL OR to_ts IS NULL OR from_ts >= to_ts THEN
    RAISE EXCEPTION 'from_ts must be earlier than to_ts' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object('hour', hours.hour, 'count', COALESCE(counts.session_count, 0))
    ORDER BY hours.hour
  ), '[]'::jsonb)
  INTO result
  FROM pg_catalog.generate_series(0, 23) AS hours(hour)
  LEFT JOIN (
    SELECT EXTRACT(hour FROM s.started_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::integer AS hour,
           pg_catalog.count(*)::integer AS session_count
    FROM public.wifi_sessions AS s
    WHERE s.started_at >= from_ts AND s.started_at < to_ts
    GROUP BY 1
  ) AS counts USING (hour);

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_session_duration_distribution(from_ts timestamptz, to_ts timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT (COALESCE(auth.role() = 'service_role', false)
      OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF from_ts IS NULL OR to_ts IS NULL OR from_ts >= to_ts THEN
    RAISE EXCEPTION 'from_ts must be earlier than to_ts' USING ERRCODE = '22023';
  END IF;

  WITH durations AS (
    SELECT EXTRACT(epoch FROM (COALESCE(s.ended_at, s.last_seen) - s.started_at)) / 60 AS duration_min
    FROM public.wifi_sessions AS s
    WHERE s.started_at >= from_ts AND s.started_at < to_ts
  ),
  buckets AS (
    SELECT bucket.label, bucket.sort_order, pg_catalog.count(durations.duration_min)::integer AS session_count
    FROM (VALUES
      ('<5', 1), ('5-15', 2), ('15-30', 3), ('30-45', 4), ('45-60', 5), ('>60', 6)
    ) AS bucket(label, sort_order)
    LEFT JOIN durations ON CASE bucket.sort_order
      WHEN 1 THEN durations.duration_min < 5
      WHEN 2 THEN durations.duration_min >= 5 AND durations.duration_min < 15
      WHEN 3 THEN durations.duration_min >= 15 AND durations.duration_min < 30
      WHEN 4 THEN durations.duration_min >= 30 AND durations.duration_min < 45
      WHEN 5 THEN durations.duration_min >= 45 AND durations.duration_min <= 60
      ELSE durations.duration_min > 60
    END
    GROUP BY bucket.label, bucket.sort_order
  )
  SELECT pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object('bucket', label, 'count', session_count)
    ORDER BY sort_order
  ) INTO result
  FROM buckets;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_consent_rate()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT (COALESCE(auth.role() = 'service_role', false)
      OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;

  WITH latest_consents AS (
    SELECT DISTINCT ON (consent.customer_id) consent.customer_id, consent.consented
    FROM public.marketing_consents AS consent
    JOIN public.profiles AS profile ON profile.id = consent.customer_id AND profile.role = 'customer'
    ORDER BY consent.customer_id, consent.created_at DESC, consent.id DESC
  ),
  totals AS (
    SELECT
      pg_catalog.count(*) FILTER (WHERE consented IS TRUE)::integer AS consented_count,
      pg_catalog.count(*) FILTER (WHERE consented IS FALSE)::integer AS declined_count
    FROM latest_consents
  )
  SELECT pg_catalog.jsonb_build_object(
    'consented_count', consented_count,
    'declined_count', declined_count,
    'rate', CASE
      WHEN consented_count + declined_count = 0 THEN NULL
      ELSE pg_catalog.round((consented_count::numeric / (consented_count + declined_count)) * 100, 2)
    END
  ) INTO result
  FROM totals;

  RETURN result;
END;
$function$;

-- Only authenticated admins and the trusted server role may execute these analytics functions.
REVOKE ALL ON FUNCTION public.get_dashboard_summary(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_demographics() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_peak_hours(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_session_duration_distribution(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_consent_rate() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_demographics() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_peak_hours(timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_session_duration_distribution(timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_consent_rate() TO authenticated, service_role;
