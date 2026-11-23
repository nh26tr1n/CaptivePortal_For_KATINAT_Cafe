import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AdminDevice } from '@/services/customer.service';

export async function DevicesTable({ devices }: { devices: AdminDevice[] }) {
  const [t, common, locale] = await Promise.all([
    getTranslations('admin'),
    getTranslations('common'),
    getLocale()
  ]);
  const language = locale === 'vi' ? 'vi-VN' : 'en-US';
  const formatDate = (value: string) => new Intl.DateTimeFormat(language, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(new Date(value));
  const deviceType = (value: AdminDevice['device_type']) => {
    if (value === 'iphone') return t('deviceIphone');
    if (value === 'android') return t('deviceAndroid');
    if (value === 'laptop') return t('deviceLaptop');
    if (value === 'tablet') return t('deviceTablet');
    return t('deviceUnknown');
  };

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('fingerprint')}</TableHead>
            <TableHead>{t('deviceType')}</TableHead>
            <TableHead>{t('customer')}</TableHead>
            <TableHead>{t('firstSeen')}</TableHead>
            <TableHead>{t('lastSeen')}</TableHead>
            <TableHead>{t('sessionCount')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {devices.length ? devices.map((device) => (
            <TableRow key={device.id}>
              <TableCell className="font-mono text-xs">{device.device_fingerprint.slice(0, 12)}…</TableCell>
              <TableCell><Badge variant="secondary">{deviceType(device.device_type)}</Badge></TableCell>
              <TableCell>
                {device.customer ? (
                  <Link className="underline-offset-4 hover:underline" href={`/admin/customers/${device.customer.id}`}>
                    {device.customer.full_name ?? device.customer.email ?? common('noData')}
                  </Link>
                ) : common('noData')}
              </TableCell>
              <TableCell className="whitespace-nowrap">{formatDate(device.first_seen)}</TableCell>
              <TableCell className="whitespace-nowrap">{formatDate(device.last_seen)}</TableCell>
              <TableCell>{device.sessionCount}</TableCell>
            </TableRow>
          )) : (
            <TableRow><TableCell className="h-24 text-center" colSpan={6}>{common('noData')}</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
