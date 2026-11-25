import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getVouchers } from '@/lib/services/voucher.service';

export default async function VouchersPage() {
  const [{ vouchers, stats }, t, common, locale] = await Promise.all([
    getVouchers(), getTranslations('admin'), getTranslations('common'), getLocale()
  ]);
  const language = locale === 'vi' ? 'vi-VN' : 'en-US';
  const now = Date.now();
  const cards = [
    [t('voucherTotal'), stats?.total ?? null],
    [t('voucherActiveCount'), stats?.active ?? null],
    [t('voucherRedeemedCount'), stats?.redeemed ?? null],
    [t('voucherExpiredCount'), stats?.expired ?? null]
  ] as const;
  const formatDate = (value: string | null) => {
    if (!value) return common('noData');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return common('noData');
    return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
  };
  const formatDiscount = (type: string, value: number) => type === 'percent'
    ? `${new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(value)}%`
    : new Intl.NumberFormat(language, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold tracking-tight">{t('vouchersPageTitle')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('vouchersPageDescription')}</p></div>
        <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/admin/vouchers/redeem">{t('voucherRedeemTitle')}</Link></Button><Button asChild><Link href="/admin/vouchers/new">{t('createVoucher')}</Link></Button></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value]) => <Card key={label}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{value === null ? common('noData') : value.toLocaleString(language)}</p></CardContent></Card>)}
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('voucherRedemptionRate')}</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{stats?.redemptionRate === null || stats?.redemptionRate === undefined ? common('noData') : `${stats.redemptionRate.toLocaleString(language, { maximumFractionDigits: 1 })}%`}</p><p className="mt-2 text-xs text-muted-foreground">{t('voucherRedemptionRateHelp')}</p></CardContent></Card>
      </div>

      <Card><CardContent className="overflow-x-auto p-0">
        <Table><TableHeader><TableRow>
          <TableHead>{t('voucherCode')}</TableHead><TableHead>{t('voucherDescription')}</TableHead><TableHead>{t('discount')}</TableHead>
          <TableHead>{t('maxUses')}</TableHead><TableHead>{t('usedCount')}</TableHead><TableHead>{t('expiresAt')}</TableHead>
          <TableHead>{t('status')}</TableHead><TableHead>{t('actions')}</TableHead>
        </TableRow></TableHeader>
          <TableBody>{vouchers?.length ? vouchers.map((voucher) => {
            const expired = Boolean(voucher.expires_at && new Date(voucher.expires_at).getTime() <= now);
            const exhausted = voucher.max_uses !== null && voucher.used_count >= voucher.max_uses;
            const label = expired ? t('voucherExpired') : voucher.active && !exhausted ? t('voucherActive') : t('voucherInactive');
            return <TableRow key={voucher.id}>
              <TableCell className="font-mono font-medium">{voucher.code}</TableCell>
              <TableCell className="max-w-64 truncate">{voucher.description ?? common('noData')}</TableCell>
              <TableCell className="whitespace-nowrap">{formatDiscount(voucher.discount_type, voucher.discount_value)}</TableCell>
              <TableCell>{voucher.max_uses?.toLocaleString(language) ?? t('unlimitedUses')}</TableCell>
              <TableCell>{voucher.used_count.toLocaleString(language)}</TableCell>
              <TableCell className="whitespace-nowrap">{formatDate(voucher.expires_at)}</TableCell>
              <TableCell><Badge variant={expired || !voucher.active || exhausted ? 'secondary' : 'default'}>{label}</Badge></TableCell>
              <TableCell><Button asChild size="sm" variant="outline"><Link href={`/admin/vouchers/${voucher.id}`}>{t('viewVoucher')}</Link></Button></TableCell>
            </TableRow>;
          }) : <TableRow><TableCell className="h-24 text-center" colSpan={8}>{common('noData')}</TableCell></TableRow>}</TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
