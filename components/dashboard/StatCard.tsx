'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

type StatCardProps = {
  label: string;
  value: string;
  delta?: number | null;
  icon?: LucideIcon;
  accent?: 'indigo' | 'amber' | 'emerald' | 'sky';
};

const accentStyles = {
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  sky: 'bg-sky-50 text-sky-700 ring-sky-100'
};

export function StatCard({ label, value, delta, icon: Icon, accent = 'indigo' }: StatCardProps) {
  const t = useTranslations('admin');
  const locale = useLocale() === 'vi' ? 'vi-VN' : 'en-US';
  const formattedDelta = typeof delta === 'number'
    ? `${delta > 0 ? '+' : ''}${delta.toLocaleString(locale, { maximumFractionDigits: 1 })}%`
    : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
        <CardTitle className="max-w-[75%] text-sm font-medium text-slate-500">{label}</CardTitle>
        {Icon ? (
          <div className={`grid h-10 w-10 place-items-center rounded-xl ring-1 ${accentStyles[accent]}`}>
            <Icon aria-hidden="true" className="h-5 w-5" />
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight text-slate-900">{value}</p>
        <p className="mt-2 min-h-4 text-xs font-medium text-slate-500">
          {formattedDelta ? `${formattedDelta} ${t('vsPreviousPeriod')}` : t('noComparison')}
        </p>
      </CardContent>
    </Card>
  );
}
