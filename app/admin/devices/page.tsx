import { getTranslations } from 'next-intl/server';
import { DevicesTable } from '@/components/admin/DevicesTable';
import { getAdminDevices } from '@/lib/services/customer.service';

export default async function DevicesPage() {
  const [t, devices] = await Promise.all([
    getTranslations('admin'),
    getAdminDevices()
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('devicesPageTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('devicesPageDescription')}</p>
      </div>
      <DevicesTable devices={devices} />
    </div>
  );
}
