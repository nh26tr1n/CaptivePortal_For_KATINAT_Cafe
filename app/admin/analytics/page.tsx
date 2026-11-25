import { getTranslations } from 'next-intl/server';
import { AgeBarChart } from '@/components/charts/AgeBarChart';
import { ConsentRateCard } from '@/components/charts/ConsentRateCard';
import { DurationDistributionChart } from '@/components/charts/DurationDistributionChart';
import { GenderPieChart } from '@/components/charts/GenderPieChart';
import { LoginMethodChart } from '@/components/charts/LoginMethodChart';
import { NewVsReturningChart } from '@/components/charts/NewVsReturningChart';
import { PeakHoursChart } from '@/components/charts/PeakHoursChart';
import { SessionTimeByDateChart } from '@/components/charts/SessionTimeByDateChart';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { Card, CardContent } from '@/components/ui/card';
import { resolveDateRange } from '@/lib/services/date-range';
import { getAnalyticsData } from '@/lib/services/analytics.service';

type PageProps = { searchParams?: Record<string, string | string[] | undefined> };

export default async function AnalyticsPage({ searchParams = {} }: PageProps) {
  const range = resolveDateRange(searchParams);
  const t = await getTranslations('admin');
  const data = await getAnalyticsData(range);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('analyticsPageTitle')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('analyticsPageDescription')}</p>
        </div>
        <DateRangeFilter fromDate={range.fromDate} preset={range.preset} toDate={range.toDate} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <GenderPieChart data={data.genders} />
        <AgeBarChart data={data.ages} />
        <PeakHoursChart data={data.peakHours} />
        <DurationDistributionChart data={data.durations} />
        <SessionTimeByDateChart data={data.sessionTimeByDate} />
        <NewVsReturningChart data={data.guestTypes} />
        <ConsentRateCard data={data.consent} />
        <LoginMethodChart data={data.loginMethods} />
      </div>

      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">{t('activeDurationNote')}</CardContent>
      </Card>
    </div>
  );
}
