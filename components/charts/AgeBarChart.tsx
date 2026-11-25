'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartEmptyState } from '@/components/charts/useNoChartData';
import type { CountPoint } from '@/types';

export function AgeBarChart({ data }: { data: CountPoint[] | null }) {
  const t = useTranslations('admin');
  const common = useTranslations('common');
  const hasData = Boolean(data?.length && data.some((item) => item.count > 0));
  const labels: Record<string, string> = {
    under_18: t('ageUnder18'), '18_24': t('age18To24'), '25_34': t('age25To34'),
    '35_44': t('age35To44'), '45_54': t('age45To54'), '55_plus': t('age55Plus'),
    undisclosed: t('ageUndisclosed')
  };
  const chartData = data?.map((item) => ({ ...item, label: labels[item.key] ?? common('noData') })) ?? [];

  return (
    <Card>
      <CardHeader><CardTitle>{t('ageDistribution')}</CardTitle></CardHeader>
      <CardContent className="h-72">
        {hasData ? (
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={chartData} margin={{ bottom: 18, left: 0, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" interval={0} angle={-24} textAnchor="end" height={58} />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value) => [`${value} ${t('count')}`, t('ageGroupLabel')]} />
              <Legend formatter={() => t('count')} />
              <Bar dataKey="count" fill="var(--chart-2)" name={t('count')} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <ChartEmptyState />}
      </CardContent>
    </Card>
  );
}
