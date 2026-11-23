import { getTranslations } from 'next-intl/server';
import { VoucherRedeemForm } from '@/components/admin/VoucherRedeemForm';

export default async function VoucherRedeemPage() {
  const t = await getTranslations('admin');
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold tracking-tight">{t('voucherRedeemTitle')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('voucherRedeemDescription')}</p></div><VoucherRedeemForm /></div>;
}
