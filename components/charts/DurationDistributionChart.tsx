'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartEmptyState } from '@/components/charts/useNoChartData';
import type { CountPoint } from '@/types';

export function DurationDistributionChart({ data }: { data: CountPoint[] | null }) {
  const t = useTranslations('admin');
  const hasData = Boolean(data?.length && data.some((item) => item.count > 0));
  const labels: Record<string, string> = {
    '<5': t('durationUnder5'),
    '5-15': t('duration5To15'),
    '15-30': t('duration15To30'),
    '30-45': t('duration30To45'),
    '45-60': t('duration45To60'),
    '>60': t('durationOver60')
  };
  const chartData = data?.map((item) => ({ ...item, label: labels[item.key] ?? item.key })) ?? [];

  return (
    <Card>
      <CardHeader><CardTitle>{t('durationDistribution')}</CardTitle></CardHeader>
      <CardContent className="h-72">
        {hasData ? (
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={chartData} margin={{ bottom: 12, left: 0, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" interval={0} angle={-15} textAnchor="end" height={45} />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value) => [`${value} ${t('count')}`, t('durationBucket')]} />
              <Legend formatter={() => t('sessionCountLabel')} />
              <Bar dataKey="count" fill="var(--chart-4)" name={t('sessionCountLabel')} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <ChartEmptyState />}
      </CardContent>
    </Card>
  );
}
