import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getVoucherDetails } from '@/services/voucher.service';
import { DeleteVoucherButton } from '@/components/admin/DeleteVoucherButton';

type PageProps = { params: { id: string } };

export default async function VoucherDetailsPage({ params }: PageProps) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const [data, t, common, locale] = await Promise.all([
    getVoucherDetails(params.id), getTranslations('admin'), getTranslations('common'), getLocale()
  ]);
  if (!data) notFound();
  const language = locale === 'vi' ? 'vi-VN' : 'en-US';
  const { voucher, redemptions } = data;
  const formatDate = (value: string | null) => value
    ? new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value))
    : common('noData');
  const discount = voucher.discount_type === 'percent'
    ? `${new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(voucher.discount_value)}%`
    : new Intl.NumberFormat(language, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(voucher.discount_value);
  const expired = Boolean(voucher.expires_at && new Date(voucher.expires_at).getTime() <= Date.now());
  const exhausted = voucher.max_uses !== null && voucher.used_count >= voucher.max_uses;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-mono text-2xl font-semibold tracking-tight">{voucher.code}</h1><p className="mt-1 text-sm text-muted-foreground">{voucher.description ?? common('noData')}</p></div><div className="flex gap-2"><Button asChild variant="outline"><Link href="/admin/vouchers">{t('backToVouchers')}</Link></Button><DeleteVoucherButton voucherCode={voucher.code} voucherId={voucher.id} /></div></div>
      <Card><CardHeader><CardTitle>{t('voucherDetails')}</CardTitle></CardHeader><CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <Detail label={t('discount')} value={discount} /><Detail label={t('maxUses')} value={voucher.max_uses?.toLocaleString(language) ?? t('unlimitedUses')} />
        <Detail label={t('usedCount')} value={voucher.used_count.toLocaleString(language)} /><Detail label={t('expiresAt')} value={formatDate(voucher.expires_at)} />
        <div><p className="text-muted-foreground">{t('status')}</p><Badge className="mt-1" variant={voucher.active && !expired && !exhausted ? 'default' : 'secondary'}>{expired ? t('voucherExpired') : voucher.active && !exhausted ? t('voucherActive') : t('voucherInactive')}</Badge></div>
        <Detail label={t('createdAt')} value={formatDate(voucher.created_at)} />
      </CardContent></Card>
      <Card><CardHeader><CardTitle>{t('voucherRedemptions')}</CardTitle></CardHeader><CardContent className="overflow-x-auto p-0">
        <Table><TableHeader><TableRow><TableHead>{t('customer')}</TableHead><TableHead>{t('customerEmail')}</TableHead><TableHead>{t('redeemedAt')}</TableHead></TableRow></TableHeader>
          <TableBody>{redemptions.length ? redemptions.map((redemption) => <TableRow key={redemption.id}><TableCell>{redemption.customer?.full_name ?? common('noData')}</TableCell><TableCell>{redemption.customer?.email ?? common('noData')}</TableCell><TableCell className="whitespace-nowrap">{formatDate(redemption.redeemed_at)}</TableCell></TableRow>) : <TableRow><TableCell className="h-24 text-center" colSpan={3}>{common('noData')}</TableCell></TableRow>}</TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-muted-foreground">{label}</p><p className="mt-1 break-all font-medium">{value}</p></div>;
}
