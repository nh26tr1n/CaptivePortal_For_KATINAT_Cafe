import { getLocale, getTranslations } from 'next-intl/server';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { StatCard } from '@/components/dashboard/StatCard';
import { createClient } from '@/lib/supabase/server';
import { resolveDateRange } from '@/services/date-range';
import { getVouchers } from '@/services/voucher.service';
import { CreditCard, Mail, TicketCheck, QrCode } from 'lucide-react';

type PageProps = { searchParams?: Record<string, string | string[] | undefined> };
export const dynamic = 'force-dynamic';

type Summary = {
  total_sessions: number | null;
  unique_guests: number | null;
  avg_duration_min: number | null;
  daily_sessions: { date: string; count: number }[] | null;
  online_now: number | null;
  returning_guests: number | null;
  marketing_subscribers: number | null;
};

function readSummary(value: unknown): Summary | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const numeric = (key: string) => typeof raw[key] === 'number' ? raw[key] as number : null;
  const daily = raw.daily_sessions;
  return {
    total_sessions: numeric('total_sessions'),
    unique_guests: numeric('unique_guests'),
    avg_duration_min: numeric('avg_duration_min'),
    daily_sessions: Array.isArray(daily)
      ? daily.filter((item): item is { date: string; count: number } => Boolean(item)
          && typeof item === 'object'
          && typeof (item as Record<string, unknown>).date === 'string'
          && typeof (item as Record<string, unknown>).count === 'number')
      : null,
    online_now: numeric('online_now'),
    returning_guests: numeric('returning_guests'),
    marketing_subscribers: numeric('marketing_subscribers')
  };
}

function emptySummary(): Summary {
  return {
    total_sessions: 0,
    unique_guests: 0,
    avg_duration_min: null,
    daily_sessions: [],
    online_now: 0,
    returning_guests: 0,
    marketing_subscribers: 0
  };
}

function percentageDelta(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export default async function DashboardPage({ searchParams = {} }: PageProps) {
  try {
  const [t, common, locale] = await Promise.all([
    getTranslations('admin'),
    getTranslations('common'),
    getLocale()
  ]);
  const range = resolveDateRange(searchParams);
  const supabase = await createClient();
  const [currentResult, previousResult, durationResult, previousDurationResult, locationsResult, hotspotsResult, voucherData] = await Promise.all([
    supabase.rpc('get_dashboard_summary', { from_ts: range.fromTimestamp, to_ts: range.toExclusiveTimestamp }),
    supabase.rpc('get_dashboard_summary', { from_ts: range.previousFromTimestamp, to_ts: range.previousToExclusiveTimestamp }),
    supabase.rpc('get_dashboard_total_duration', { from_ts: range.fromTimestamp, to_ts: range.toExclusiveTimestamp }),
    supabase.rpc('get_dashboard_total_duration', { from_ts: range.previousFromTimestamp, to_ts: range.previousToExclusiveTimestamp }),
    supabase.from('locations').select('id', { count: 'exact', head: true }),
    supabase.from('hotspots').select('id', { count: 'exact', head: true }),
    getVouchers()
  ]);
  const failedResults = [
    ['current dashboard summary', currentResult.error],
    ['previous dashboard summary', previousResult.error],
    ['dashboard session duration', durationResult.error],
    ['previous dashboard session duration', previousDurationResult.error],
    ['dashboard locations', locationsResult.error],
    ['dashboard hotspots', hotspotsResult.error]
  ] as const;
  for (const [operation, error] of failedResults) {
    if (error) {
      console.error(`[admin/dashboard] ${operation} request failed`, error);
      throw new Error(`Could not load ${operation}: ${error.message}`);
    }
  }

  const parsedCurrent = readSummary(currentResult.data);
  const parsedPrevious = readSummary(previousResult.data);
  if (!parsedCurrent || !parsedPrevious) {
    console.error('[admin/dashboard] dashboard summary returned empty or invalid data', {
      current: currentResult.data,
      previous: previousResult.data
    });
  }
  const current = parsedCurrent ?? emptySummary();
  const previous = parsedPrevious ?? emptySummary();
  const totalDuration = durationResult.data;
  const previousDuration = previousDurationResult.data;
  const dailyAverage = current?.daily_sessions?.length
    ? current.daily_sessions.reduce((sum, item) => sum + item.count, 0) / current.daily_sessions.length
    : null;
  const previousDailyAverage = previous?.daily_sessions?.length
    ? previous.daily_sessions.reduce((sum, item) => sum + item.count, 0) / previous.daily_sessions.length
    : null;
  const numberFormat = new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 1 });
  const countValue = (value: number | null) => value === null ? common('noData') : numberFormat.format(value);
  const durationValue = (value: number | null) => value === null
    ? common('noData')
    : `${numberFormat.format(value)} ${t('minutesShort')}`;

  const cards = [
    { label: t('totalSessions'), value: countValue(current?.total_sessions ?? null), delta: percentageDelta(current?.total_sessions ?? null, previous?.total_sessions ?? null) },
    { label: t('uniqueGuests'), value: countValue(current?.unique_guests ?? null), delta: percentageDelta(current?.unique_guests ?? null, previous?.unique_guests ?? null) },
    { label: t('totalSessionTime'), value: durationValue(totalDuration), delta: percentageDelta(totalDuration, previousDuration) },
    { label: t('avgSessionTime'), value: durationValue(current?.avg_duration_min ?? null), delta: percentageDelta(current?.avg_duration_min ?? null, previous?.avg_duration_min ?? null) },
    { label: t('dailySessions'), value: countValue(dailyAverage), delta: percentageDelta(dailyAverage, previousDailyAverage) },
    { label: t('currentlyOnline'), value: countValue(current?.online_now ?? null), delta: null },
    { label: t('returningGuests'), value: countValue(current?.returning_guests ?? null), delta: percentageDelta(current?.returning_guests ?? null, previous?.returning_guests ?? null) },
    { label: t('marketingSubscribers'), value: countValue(current?.marketing_subscribers ?? null), delta: null },
    { label: t('totalLocations'), value: countValue(locationsResult.count), delta: null },
    { label: t('totalHotspots'), value: countValue(hotspotsResult.count), delta: null }
  ];

  const businessCards = [
    {
      label: t('voucherIssuedCount'),
      value: voucherData.stats ? voucherData.stats.total.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US') : common('noData'),
      icon: TicketCheck,
      accent: 'indigo' as const
    },
    {
      label: t('voucherUsedCount'),
      value: voucherData.stats ? voucherData.stats.redeemed.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US') : common('noData'),
      icon: CreditCard,
      accent: 'emerald' as const
    },
    {
      label: t('currentActiveQr'),
      value: voucherData.stats ? voucherData.stats.active.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US') : common('noData'),
      icon: QrCode,
      accent: 'amber' as const
    },
    {
      label: t('marketingSubscribers'),
      value: countValue(current?.marketing_subscribers ?? null),
      icon: Mail,
      accent: 'sky' as const
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('dashboardTitle')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('dashboardDescription')}</p>
        </div>
        <DateRangeFilter fromDate={range.fromDate} preset={range.preset} toDate={range.toDate} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {businessCards.map((card) => <StatCard key={card.label} {...card} />)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {cards.map((card) => <StatCard key={card.label} {...card} />)}
      </div>
      {(current.total_sessions ?? 0) === 0 && (
        <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">{common('noData')}</p>
      )}
    </div>
  );
  } catch (error) {
    console.error('[admin/dashboard] failed to render dashboard', error);
    throw error;
  }
}
