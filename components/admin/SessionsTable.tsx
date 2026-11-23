'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Papa from 'papaparse';
import { useLocale, useTranslations } from 'next-intl';
import { Download, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SessionListItem } from '@/services/session.service';

type SessionsTableProps = {
  sessions: SessionListItem[];
  count: number | null;
  page: number;
  pageSize: number;
  filters: { search: string; status: string; loginMethod: string; deviceType: string };
};

export function SessionsTable({ sessions, count, page, pageSize, filters }: SessionsTableProps) {
  const t = useTranslations('admin');
  const common = useTranslations('common');
  const locale = useLocale() === 'vi' ? 'vi-VN' : 'en-US';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(filters.search);

  const updateParams = useCallback((values: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    if (!Object.prototype.hasOwnProperty.call(values, 'page')) params.delete('page');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => setSearch(filters.search), [filters.search]);
  useEffect(() => {
    const normalized = search.trim();
    if (normalized === filters.search) return;
    const timer = window.setTimeout(() => updateParams({ q: normalized || undefined }), 350);
    return () => window.clearTimeout(timer);
  }, [filters.search, search, updateParams]);

  function formatDate(value: string | null) {
    if (!value) return common('noData');
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
  }

  function formatDuration(session: SessionListItem) {
    const end = session.ended_at ?? session.last_seen;
    const minutes = Math.max(0, Math.round((new Date(end).getTime() - new Date(session.started_at).getTime()) / 60_000));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours ? t('durationHoursMinutes', { hours, minutes: remainingMinutes }) : t('durationMinutes', { minutes });
  }

  function formatBytes(value: number | null) {
    if (value === null) return common('noData');
    if (value < 1024) return `${value} ${t('bytesShort')}`;
    const units = [t('kilobytesShort'), t('megabytesShort'), t('gigabytesShort')];
    let amount = value / 1024;
    let unitIndex = 0;
    while (amount >= 1024 && unitIndex < units.length - 1) {
      amount /= 1024;
      unitIndex += 1;
    }
    return `${amount.toLocaleString(locale, { maximumFractionDigits: 1 })} ${units[unitIndex]}`;
  }

  function loginLabel(value: SessionListItem['login_method']) {
    if (value === 'google') return t('loginGoogle');
    if (value === 'facebook') return t('loginFacebook');
    return t('loginEmail');
  }

  function deviceLabel(value: SessionListItem['device']) {
    if (value?.device_type === 'iphone') return t('deviceIphone');
    if (value?.device_type === 'android') return t('deviceAndroid');
    if (value?.device_type === 'laptop') return t('deviceLaptop');
    if (value?.device_type === 'tablet') return t('deviceTablet');
    if (value?.device_type === 'unknown') return t('deviceUnknown');
    return common('noData');
  }

  function statusLabel(value: SessionListItem['status']) {
    if (value === 'online') return t('sessionOnline');
    if (value === 'offline') return t('sessionOffline');
    return t('sessionExpired');
  }

  function exportCsv() {
    const csv = Papa.unparse(sessions.map((session) => ({
      [t('customer')]: session.customer?.email ?? session.customer?.full_name ?? '',
      [t('device')]: deviceLabel(session.device),
      [t('loginMethod')]: loginLabel(session.login_method),
      [t('startTime')]: formatDate(session.started_at),
      [t('endTime')]: formatDate(session.ended_at),
      [t('duration')]: formatDuration(session),
      [t('lastActivity')]: formatDate(session.last_seen),
      [t('dataUsage')]: `${formatBytes(session.download_bytes)} / ${formatBytes(session.upload_bytes)}`,
      [t('status')]: statusLabel(session.status)
    })));
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'katinat-sessions.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const startRecord = count ? (page - 1) * pageSize + 1 : 0;
  const endRecord = Math.min(page * pageSize, count ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 lg:flex-row lg:items-end">
        <div className="min-w-56 flex-1 space-y-2">
          <Label htmlFor="session-search">{t('searchSessions')}</Label>
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" id="session-search" onChange={(event) => setSearch(event.target.value)} placeholder={t('searchEmail')} value={search} />
          </div>
        </div>
        <FilterSelect id="session-status" label={t('status')} value={filters.status} allLabel={t('allStatuses')} onChange={(value) => updateParams({ status: value })}>
          <SelectItem value="online">{t('sessionOnline')}</SelectItem>
          <SelectItem value="offline">{t('sessionOffline')}</SelectItem>
          <SelectItem value="expired">{t('sessionExpired')}</SelectItem>
        </FilterSelect>
        <FilterSelect id="session-login-method" label={t('loginMethod')} value={filters.loginMethod} allLabel={t('allLoginMethods')} onChange={(value) => updateParams({ login_method: value })}>
          <SelectItem value="google">{t('loginGoogle')}</SelectItem>
          <SelectItem value="facebook">{t('loginFacebook')}</SelectItem>
          <SelectItem value="email">{t('loginEmail')}</SelectItem>
        </FilterSelect>
        <FilterSelect id="session-device-type" label={t('deviceType')} value={filters.deviceType} allLabel={t('allDeviceTypes')} onChange={(value) => updateParams({ device_type: value })}>
          <SelectItem value="iphone">{t('deviceIphone')}</SelectItem>
          <SelectItem value="android">{t('deviceAndroid')}</SelectItem>
          <SelectItem value="laptop">{t('deviceLaptop')}</SelectItem>
          <SelectItem value="tablet">{t('deviceTablet')}</SelectItem>
          <SelectItem value="unknown">{t('deviceUnknown')}</SelectItem>
        </FilterSelect>
        <Button className="shrink-0" disabled={!sessions.length} onClick={exportCsv} type="button" variant="outline">
          <Download aria-hidden="true" />{t('exportCurrentPage')}
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('customer')}</TableHead>
                <TableHead>{t('device')}</TableHead>
                <TableHead>{t('loginMethod')}</TableHead>
                <TableHead>{t('startTime')}</TableHead>
                <TableHead>{t('endTime')}</TableHead>
                <TableHead>{t('duration')}</TableHead>
                <TableHead>{t('lastActivity')}</TableHead>
                <TableHead>{t('dataUsage')}</TableHead>
                <TableHead>{t('status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length ? sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="min-w-40">
                    <Link className="font-medium underline-offset-4 hover:underline" href={`/admin/customers/${session.customer_id}`}>
                      {session.customer?.email ?? session.customer?.full_name ?? common('noData')}
                    </Link>
                  </TableCell>
                  <TableCell>{deviceLabel(session.device)}</TableCell>
                  <TableCell>{loginLabel(session.login_method)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(session.started_at)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(session.ended_at)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDuration(session)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(session.last_seen)}</TableCell>
                  <TableCell className="min-w-36">{formatBytes(session.download_bytes)} / {formatBytes(session.upload_bytes)}</TableCell>
                  <TableCell><Badge variant={session.status === 'online' ? 'default' : 'secondary'}>{statusLabel(session.status)}</Badge></TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell className="h-24 text-center" colSpan={9}>{common('noData')}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <p className="text-sm text-muted-foreground">{t('paginationSummary', { start: startRecord, end: endRecord, total: count ?? 0 })}</p>
          <div className="flex gap-2">
            <Button disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) })} type="button" variant="outline">{t('previous')}</Button>
            <span className="flex items-center px-2 text-sm">{t('pageSummary', { page, total: totalPages })}</span>
            <Button disabled={page >= totalPages} onClick={() => updateParams({ page: String(page + 1) })} type="button" variant="outline">{t('next')}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ id, label, value, allLabel, onChange, children }: {
  id: string;
  label: string;
  value: string;
  allLabel: string;
  onChange: (value: string | undefined) => void;
  children: ReactNode;
}) {
  return (
    <div className="min-w-36 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select onValueChange={(next) => onChange(next === 'all' ? undefined : next)} value={value || 'all'}>
        <SelectTrigger id={id}><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="all">{allLabel}</SelectItem>{children}</SelectContent>
      </Select>
    </div>
  );
}
