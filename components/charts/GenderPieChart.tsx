'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartEmptyState } from '@/components/charts/useNoChartData';
import type { CountPoint } from '@/services/analytics.service';

const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];

export function GenderPieChart({ data }: { data: CountPoint[] | null }) {
  const t = useTranslations('admin');
  const common = useTranslations('common');
  const hasData = Boolean(data?.length && data.some((item) => item.count > 0));
  const labels: Record<string, string> = {
    male: t('genderMale'), female: t('genderFemale'), other: t('genderOther'), undisclosed: t('genderUndisclosed')
  };
  const chartData = data?.map((item) => ({ ...item, label: labels[item.key] ?? common('noData') })) ?? [];

  return (
    <Card>
      <CardHeader><CardTitle>{t('genderDistribution')}</CardTitle></CardHeader>
      <CardContent className="h-72">
        {hasData ? (
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie data={chartData} dataKey="count" nameKey="label" outerRadius={88}>
                {chartData.map((entry, index) => <Cell fill={colors[index % colors.length]} key={entry.key} />)}
              </Pie>
              <Tooltip formatter={(value) => [`${value} ${t('count')}`, t('genderLabel')]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : <ChartEmptyState />}
      </CardContent>
    </Card>
  );
}
