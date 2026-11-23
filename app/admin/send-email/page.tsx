import { getTranslations } from 'next-intl/server';
import { SmtpMarketingForm } from '@/components/admin/SmtpMarketingForm';

export default async function SendEmailPage() {
  const t = await getTranslations('admin');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('smtpTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('smtpDescription')}</p>
      </div>
      <SmtpMarketingForm />
    </div>
  );
}
