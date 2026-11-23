'use client';

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartEmptyState } from '@/components/charts/useNoChartData';
import type { DateSessionPoint } from '@/services/analytics.service';

export function SessionTimeByDateChart({ data }: { data: DateSessionPoint[] | null }) {
  const t = useTranslations('admin');
  const common = useTranslations('common');
  const locale = useLocale() === 'vi' ? 'vi-VN' : 'en-US';
  const hasData = Boolean(data?.length && data.some((item) => item.minutes > 0));
  const formatDate = (value: string | null | undefined) => {
    if (!value) return common('noData');
    const date = new Date(`${value}T12:00:00+07:00`);
    if (Number.isNaN(date.getTime())) return common('noData');
    return new Intl.DateTimeFormat(locale, {
      month: 'short', day: 'numeric', timeZone: 'Asia/Ho_Chi_Minh'
    }).format(date);
  };

  return (
    <Card>
      <CardHeader><CardTitle>{t('sessionTimeByDate')}</CardTitle></CardHeader>
      <CardContent className="h-72">
        {hasData ? (
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={data || []} margin={{ bottom: 4, left: 0, right: 10, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatDate} minTickGap={24} />
              <YAxis />
              <Tooltip labelFormatter={(label) => formatDate(String(label))} formatter={(value) => [`${value} ${t('minutesShort')}`, t('dailyDuration')]} />
              <Legend formatter={() => t('dailyDuration')} />
              <Line dataKey="minutes" dot={false} name={t('dailyDuration')} stroke="var(--chart-1)" strokeWidth={2} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        ) : <ChartEmptyState />}
      </CardContent>
    </Card>
  );
}
