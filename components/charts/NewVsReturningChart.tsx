'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartEmptyState } from '@/components/charts/useNoChartData';

type GuestTypes = { new_guests: number; returning_guests: number } | null;

export function NewVsReturningChart({ data }: { data: GuestTypes }) {
  const t = useTranslations('admin');
  const hasData = Boolean(data && data.new_guests + data.returning_guests > 0);
  const chartData = data ? [
    { key: 'new', label: t('newGuests'), count: data.new_guests },
    { key: 'returning', label: t('returningGuestsLabel'), count: data.returning_guests }
  ] : [];
  const colors = ['var(--chart-1)', 'var(--chart-2)'];

  return (
    <Card>
      <CardHeader><CardTitle>{t('newVsReturning')}</CardTitle></CardHeader>
      <CardContent className="h-72">
        {hasData ? (
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie data={chartData} dataKey="count" nameKey="label" outerRadius={88}>
                {chartData.map((entry, index) => <Cell fill={colors[index]} key={entry.key} />)}
              </Pie>
              <Tooltip formatter={(value) => [`${value} ${t('count')}`, t('customer')]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : <ChartEmptyState />}
      </CardContent>
    </Card>
  );
}
