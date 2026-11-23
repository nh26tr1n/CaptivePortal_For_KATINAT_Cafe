'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ConsentMetrics } from '@/services/analytics.service';

export function ConsentRateCard({ data }: { data: ConsentMetrics | null }) {
  const t = useTranslations('admin');
  const common = useTranslations('common');
  const locale = useLocale() === 'vi' ? 'vi-VN' : 'en-US';
  const hasData = Boolean(data && (data.consented_count + data.declined_count > 0));

  return (
    <Card>
      <CardHeader><CardTitle>{t('consentRate')}</CardTitle></CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">
          {hasData && data?.rate !== null
            ? `${data?.rate.toLocaleString(locale, { maximumFractionDigits: 1 })}%`
            : common('noData')}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-muted-foreground">{t('consentedCount')}</p><p className="font-medium">{hasData && data ? data.consented_count.toLocaleString(locale) : common('noData')}</p></div>
          <div><p className="text-muted-foreground">{t('declinedCount')}</p><p className="font-medium">{hasData && data ? data.declined_count.toLocaleString(locale) : common('noData')}</p></div>
        </div>
      </CardContent>
    </Card>
  );
}
