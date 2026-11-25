import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAdminCustomerDetails } from '@/lib/services/customer.service';

type PageProps = { params: { id: string } };

export default async function CustomerDetailsPage({ params }: PageProps) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const [data, t, common, locale] = await Promise.all([
    getAdminCustomerDetails(params.id),
    getTranslations('admin'),
    getTranslations('common'),
    getLocale()
  ]);
  if (!data) notFound();

  const language = locale === 'vi' ? 'vi-VN' : 'en-US';
  const formatDate = (value: string | null) => value
    ? Number.isNaN(new Date(value).getTime())
      ? common('noData')
      : new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value))
    : common('noData');
  const loginLabel = (value: string) => value === 'google' ? t('loginGoogle') : value === 'facebook' ? t('loginFacebook') : value === 'email' ? t('loginEmail') : common('noData');
  const genderLabel = (value: string | null) => {
    if (value === 'male') return t('genderMale');
    if (value === 'female') return t('genderFemale');
    if (value === 'other') return t('genderOther');
    if (value === 'undisclosed') return t('ageUndisclosed');
    return common('noData');
  };
  const ageLabel = (value: string | null) => {
    if (value === 'under_18') return t('ageUnder18');
    if (value === '18_24') return t('age18To24');
    if (value === '25_34') return t('age25To34');
    if (value === '35_44') return t('age35To44');
    if (value === '45_54') return t('age45To54');
    if (value === '55_plus') return t('age55Plus');
    if (value === 'undisclosed') return t('genderUndisclosed');
    return common('noData');
  };
  const deviceLabel = (value: string) => {
    if (value === 'iphone') return t('deviceIphone');
    if (value === 'android') return t('deviceAndroid');
    if (value === 'laptop') return t('deviceLaptop');
    if (value === 'tablet') return t('deviceTablet');
    return value === 'unknown' ? t('deviceUnknown') : common('noData');
  };
  const duration = (start: string, end: string) => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return common('noData');
    const minutes = Math.max(0, Math.round((endTime - startTime) / 60_000));
    const hours = Math.floor(minutes / 60);
    return hours ? t('durationHoursMinutes', { hours, minutes: minutes % 60 }) : t('durationMinutes', { minutes });
  };

  const customer = data.customer;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('customerDetails')}</h1>
        <p className="mt-1 break-all text-sm text-muted-foreground">{customer.full_name?.trim() || customer.email || customer.id}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('customerInformation')}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Detail label={t('customerId')} value={customer.id} />
          <Detail label={t('fullName')} value={customer.full_name?.trim() || common('noData')} />
          <Detail label={t('email')} value={customer.email ?? common('noData')} />
          <Detail label={t('gender')} value={genderLabel(customer.gender)} />
          <Detail label={t('ageGroup')} value={ageLabel(customer.age_group)} />
          <Detail label={t('registeredAt')} value={formatDate(customer.created_at)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('sessionHistory')}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t('startTime')}</TableHead><TableHead>{t('endTime')}</TableHead>
              <TableHead>{t('duration')}</TableHead><TableHead>{t('lastActivity')}</TableHead>
              <TableHead>{t('loginMethod')}</TableHead><TableHead>{t('status')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.sessions.length ? data.sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(session.started_at)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(session.ended_at)}</TableCell>
                  <TableCell>{duration(session.started_at, session.ended_at ?? session.last_seen)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(session.last_seen)}</TableCell>
                  <TableCell>{loginLabel(session.login_method)}</TableCell>
                  <TableCell><Badge variant={session.status === 'online' ? 'default' : 'secondary'}>{session.status === 'online' ? t('sessionOnline') : session.status === 'offline' ? t('sessionOffline') : t('sessionExpired')}</Badge></TableCell>
                </TableRow>
              )) : <EmptyRow colSpan={6} text={t('noSessions')} />}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('devices')}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t('fingerprint')}</TableHead><TableHead>{t('deviceType')}</TableHead>
              <TableHead>{t('firstSeen')}</TableHead><TableHead>{t('lastSeen')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.devices.length ? data.devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-mono text-xs">{device.device_fingerprint.slice(0, 12)}…</TableCell>
                  <TableCell>{deviceLabel(device.device_type)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(device.first_seen)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(device.last_seen)}</TableCell>
                </TableRow>
              )) : <EmptyRow colSpan={4} text={t('noDevices')} />}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('marketingConsentHistory')}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t('marketingStatus')}</TableHead><TableHead>{t('consentSource')}</TableHead>
              <TableHead>{t('consentVersion')}</TableHead><TableHead>{t('date')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.consents.length ? data.consents.map((consent) => (
                <TableRow key={consent.id}>
                  <TableCell><Badge variant={consent.consented ? 'default' : 'secondary'}>{consent.consented ? t('subscribed') : t('declined')}</Badge></TableCell>
                  <TableCell>{loginLabel(consent.source)}</TableCell>
                  <TableCell>{consent.consent_version}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(consent.created_at)}</TableCell>
                </TableRow>
              )) : <EmptyRow colSpan={4} text={t('noConsentHistory')} />}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-muted-foreground">{label}</p><p className="mt-1 break-all font-medium">{value}</p></div>;
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return <TableRow><TableCell className="h-20 text-center text-muted-foreground" colSpan={colSpan}>{text}</TableCell></TableRow>;
}
