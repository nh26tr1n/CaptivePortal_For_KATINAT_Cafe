'use client';

import { useTranslations } from 'next-intl';

export function ChartEmptyState() {
  const t = useTranslations('common');
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t('noData')}</div>;
}
