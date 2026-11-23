'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartEmptyState } from '@/components/charts/useNoChartData';

type PeakHour = { hour: number; count: number };

export function PeakHoursChart({ data }: { data: PeakHour[] | null }) {
  const t = useTranslations('admin');
  const hasData = Boolean(data?.length && data.some((item) => item.count > 0));
  const chartData = data?.map((item) => ({ ...item, label: `${String(item.hour).padStart(2, '0')}:00` })) ?? [];

  return (
    <Card>
      <CardHeader><CardTitle>{t('peakHours')}</CardTitle></CardHeader>
      <CardContent className="h-72">
        {hasData ? (
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={chartData} margin={{ bottom: 4, left: 0, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" interval={2} />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value) => [`${value} ${t('count')}`, t('hour')]} />
              <Legend formatter={() => t('sessionCountLabel')} />
              <Bar dataKey="count" fill="var(--chart-3)" name={t('sessionCountLabel')} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <ChartEmptyState />}
      </CardContent>
    </Card>
  );
}
