import { getTranslations } from 'next-intl/server';
import { VoucherForm } from '@/components/admin/VoucherForm';

export default async function NewVoucherPage() {
  const t = await getTranslations('admin');
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold tracking-tight">{t('createVoucher')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('voucherFormDescription')}</p></div><VoucherForm /></div>;
}
