import { createClient } from '@/lib/supabase/server';
import type { AnalyticsData, CountPoint, DateRange, DateSessionPoint } from '@/types';

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

async function safeRpc<T>(name: string, request: PromiseLike<{ data: T | null; error: unknown }>): Promise<T | null> {
  try {
    const result = await request;
    if (result.error) {
      console.error(`[analytics] RPC ${name} failed`, result.error);
      return null;
    }
    return result.data;
  } catch (error) {
    console.error(`[analytics] RPC ${name} threw an error`, error);
    return null;
  }
}

function emptyAnalyticsData(): AnalyticsData {
  return {
    genders: null,
    ages: null,
    peakHours: null,
    durations: null,
    sessionTimeByDate: null,
    guestTypes: null,
    consent: null,
    loginMethods: null
  };
}

export async function getAnalyticsData(range: DateRange): Promise<AnalyticsData> {
  // Active Duration and Data Usage require gateway-provided measurements; null values are never estimated here.
  try {
    const supabase = await createClient();
    const args = { from_ts: range.fromTimestamp, to_ts: range.toExclusiveTimestamp };
    const [demographics, peak, durations, consentData, timeByDate, guestData, loginMethods] = await Promise.all([
      safeRpc('get_demographics', supabase.rpc('get_demographics')),
      safeRpc('get_peak_hours', supabase.rpc('get_peak_hours', args)),
      safeRpc('get_session_duration_distribution', supabase.rpc('get_session_duration_distribution', args)),
      safeRpc('get_consent_rate', supabase.rpc('get_consent_rate')),
      safeRpc('get_session_time_by_date', supabase.rpc('get_session_time_by_date', args)),
      safeRpc('get_new_vs_returning', supabase.rpc('get_new_vs_returning', args)),
      safeRpc('get_login_method_distribution', supabase.rpc('get_login_method_distribution', args))
    ]);

    const demographicData = record(demographics);
    const consent = record(consentData);
    const guestTypes = record(guestData);

    return {
      genders: demographicData ? countRows(demographicData.gender_distribution, 'gender') : null,
      ages: demographicData ? countRows(demographicData.age_distribution, 'age_group') : null,
      peakHours: peakRows(peak),
      durations: countRows(durations, 'bucket'),
      sessionTimeByDate: dateRows(timeByDate),
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
      loginMethods: countRows(loginMethods, 'method')
    };
  } catch (error) {
    console.error('[analytics] failed to load analytics data', error);
    return emptyAnalyticsData();
  }
}
