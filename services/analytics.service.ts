import { createClient } from '@/lib/supabase/server';
import type { DateRange } from '@/services/date-range';

export type CountPoint = { key: string; count: number };
export type DateSessionPoint = { date: string; minutes: number };
export type ConsentMetrics = { consented_count: number; declined_count: number; rate: number | null };

export type AnalyticsData = {
  genders: CountPoint[] | null;
  ages: CountPoint[] | null;
  peakHours: { hour: number; count: number }[] | null;
  durations: CountPoint[] | null;
  sessionTimeByDate: DateSessionPoint[] | null;
  guestTypes: { new_guests: number; returning_guests: number } | null;
  consent: ConsentMetrics | null;
  loginMethods: CountPoint[] | null;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function countRows(value: unknown, keyField: string): CountPoint[] | null {
  if (!Array.isArray(value)) return null;
  return value.flatMap((item) => {
    const row = record(item);
    const key = row?.[keyField];
    const count = row?.count;
    return typeof key === 'string' && typeof count === 'number' ? [{ key, count }] : [];
  });
}

function dateRows(value: unknown): DateSessionPoint[] | null {
  if (!Array.isArray(value)) return null;
  return value.flatMap((item) => {
    const row = record(item);
    return typeof row?.date === 'string' && typeof row.minutes === 'number'
      ? [{ date: row.date, minutes: row.minutes }]
      : [];
  });
}

function peakRows(value: unknown) {
  if (!Array.isArray(value)) return null;
  return value.flatMap((item) => {
    const row = record(item);
    return typeof row?.hour === 'number' && typeof row.count === 'number'
      ? [{ hour: row.hour, count: row.count }]
      : [];
  });
}

export async function getAnalyticsData(range: DateRange): Promise<AnalyticsData> {
  // Active Duration and Data Usage require gateway-provided measurements; null values are never estimated here.
  try {
  const supabase = await createClient();
  const args = { from_ts: range.fromTimestamp, to_ts: range.toExclusiveTimestamp };
  const [demographicsResult, peakResult, durationResult, consentResult, timeResult, guestResult, loginResult] = await Promise.all([
    supabase.rpc('get_demographics'),
    supabase.rpc('get_peak_hours', args),
    supabase.rpc('get_session_duration_distribution', args),
    supabase.rpc('get_consent_rate'),
    supabase.rpc('get_session_time_by_date', args),
    supabase.rpc('get_new_vs_returning', args),
    supabase.rpc('get_login_method_distribution', args)
  ]);

  const failedResults = [
    ['get_demographics', demographicsResult.error],
    ['get_peak_hours', peakResult.error],
    ['get_session_duration_distribution', durationResult.error],
    ['get_consent_rate', consentResult.error],
    ['get_session_time_by_date', timeResult.error],
    ['get_new_vs_returning', guestResult.error],
    ['get_login_method_distribution', loginResult.error]
  ] as const;
  for (const [functionName, error] of failedResults) {
    if (error) {
      console.error(`[analytics] RPC ${functionName} failed`, error);
      throw new Error(`Analytics RPC ${functionName} failed: ${error.message}`);
    }
  }

  const demographics = record(demographicsResult.data);
  const consent = record(consentResult.data);
  const guestTypes = record(guestResult.data);

  return {
    genders: demographics ? countRows(demographics.gender_distribution, 'gender') : null,
    ages: demographics ? countRows(demographics.age_distribution, 'age_group') : null,
    peakHours: peakRows(peakResult.data),
    durations: countRows(durationResult.data, 'bucket'),
    sessionTimeByDate: dateRows(timeResult.data),
    guestTypes: guestTypes
      && typeof guestTypes.new_guests === 'number'
      && typeof guestTypes.returning_guests === 'number'
      ? { new_guests: guestTypes.new_guests, returning_guests: guestTypes.returning_guests }
      : null,
    consent: consent
      && typeof consent.consented_count === 'number'
      && typeof consent.declined_count === 'number'
      ? {
          consented_count: consent.consented_count,
          declined_count: consent.declined_count,
          rate: typeof consent.rate === 'number' ? consent.rate : null
        }
      : null,
    loginMethods: countRows(loginResult.data, 'method')
  };
  } catch (error) {
    console.error('[analytics] failed to load analytics data', error);
    throw error;
  }
}
