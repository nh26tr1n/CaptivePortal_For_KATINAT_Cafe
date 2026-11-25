'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CustomerSummary } from '@/types';

type CustomersTableProps = {
  customers: CustomerSummary[];
  count: number | null;
  page: number;
  pageSize: number;
  filters: { search: string; gender: string; ageGroup: string; loginMethod: string; visitType: string };
};

export function CustomersTable({ customers, count, page, pageSize, filters }: CustomersTableProps) {
  const t = useTranslations('admin');
  const common = useTranslations('common');
  const locale = useLocale() === 'vi' ? 'vi-VN' : 'en-US';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(filters.search);
  const [isExporting, setIsExporting] = useState(false);

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
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return common('noData');
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
  }

  function formatDuration(value: number | null) {
    if (value === null) return common('noData');
    return `${value.toLocaleString(locale, { maximumFractionDigits: 1 })} ${t('minutesShort')}`;
  }

  function translateGender(value: CustomerSummary['gender']) {
    if (value === 'male') return t('genderMale');
    if (value === 'female') return t('genderFemale');
    if (value === 'other') return t('genderOther');
    if (value === 'undisclosed') return t('genderUndisclosed');
    return common('noData');
  }

  function translateAge(value: CustomerSummary['age_group']) {
    if (value === 'under_18') return t('ageUnder18');
    if (value === '18_24') return t('age18To24');
    if (value === '25_34') return t('age25To34');
    if (value === '35_44') return t('age35To44');
    if (value === '45_54') return t('age45To54');
    if (value === '55_plus') return t('age55Plus');
    if (value === 'undisclosed') return t('ageUndisclosed');
    return common('noData');
  }

  function translateLogin(value: CustomerSummary['latest_login_method']) {
    if (value === 'google') return t('loginGoogle');
    if (value === 'facebook') return t('loginFacebook');
    if (value === 'email') return t('loginEmail');
    return common('noData');
  }

  async function exportCsv() {
    setIsExporting(true);
    try {
      const response = await fetch('/api/admin/export-csv', { cache: 'no-store' });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        if (result?.error === 'no_consented_customers') {
          toast.error(t('exportNoConsentedCustomers'));
          return;
        }
        toast.error(response.status === 401 ? t('adminUnauthorized') : t('exportFailed'));
        return;
      }

      const csvBlob = await response.blob();
      const url = URL.createObjectURL(csvBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'katinat-marketing-consented.csv';
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(t('customersExported'));
    } catch {
      toast.error(t('exportFailed'));
    } finally {
      setIsExporting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const startRecord = count ? (page - 1) * pageSize + 1 : 0;
  const endRecord = Math.min(page * pageSize, count ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 lg:flex-row lg:items-end">
        <div className="min-w-56 flex-1 space-y-2">
          <Label htmlFor="customer-search">{t('searchCustomers')}</Label>
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" id="customer-search" onChange={(event) => setSearch(event.target.value)} placeholder={t('searchNameOrEmail')} value={search} />
          </div>
        </div>
        <FilterSelect id="customer-gender" label={t('gender')} value={filters.gender} allLabel={t('allGenders')} onChange={(value) => updateParams({ gender: value })}>
          <SelectItem value="male">{t('genderMale')}</SelectItem>
          <SelectItem value="female">{t('genderFemale')}</SelectItem>
          <SelectItem value="other">{t('genderOther')}</SelectItem>
          <SelectItem value="undisclosed">{t('genderUndisclosed')}</SelectItem>
        </FilterSelect>
        <FilterSelect id="customer-age" label={t('ageGroup')} value={filters.ageGroup} allLabel={t('allAgeGroups')} onChange={(value) => updateParams({ age_group: value })}>
          <SelectItem value="under_18">{t('ageUnder18')}</SelectItem>
          <SelectItem value="18_24">{t('age18To24')}</SelectItem>
          <SelectItem value="25_34">{t('age25To34')}</SelectItem>
          <SelectItem value="35_44">{t('age35To44')}</SelectItem>
          <SelectItem value="45_54">{t('age45To54')}</SelectItem>
          <SelectItem value="55_plus">{t('age55Plus')}</SelectItem>
          <SelectItem value="undisclosed">{t('ageUndisclosed')}</SelectItem>
        </FilterSelect>
        <FilterSelect id="customer-login-method" label={t('latestLoginMethod')} value={filters.loginMethod} allLabel={t('allLoginMethods')} onChange={(value) => updateParams({ login_method: value })}>
          <SelectItem value="google">{t('loginGoogle')}</SelectItem>
          <SelectItem value="facebook">{t('loginFacebook')}</SelectItem>
          <SelectItem value="email">{t('loginEmail')}</SelectItem>
        </FilterSelect>
        <FilterSelect id="customer-visit-type" label={t('visitType')} value={filters.visitType} allLabel={t('allVisitTypes')} onChange={(value) => updateParams({ visit: value })}>
          <SelectItem value="new">{t('newCustomer')}</SelectItem>
          <SelectItem value="returning">{t('returningCustomer')}</SelectItem>
        </FilterSelect>
        <Button className="shrink-0" disabled={isExporting} onClick={() => void exportCsv()} type="button" variant="outline">
          <Download aria-hidden="true" />{isExporting ? common('loading') : t('exportOptedInCustomers')}
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('customerId')}</TableHead>
                <TableHead>{t('fullName')}</TableHead>
                <TableHead>{t('email')}</TableHead>
                <TableHead>{t('gender')}</TableHead>
                <TableHead>{t('ageGroup')}</TableHead>
                <TableHead>{t('latestLoginMethod')}</TableHead>
                <TableHead>{t('registeredAt')}</TableHead>
                <TableHead>{t('lastVisitAt')}</TableHead>
                <TableHead>{t('totalSessions')}</TableHead>
                <TableHead>{t('totalDuration')}</TableHead>
                <TableHead>{t('marketingStatus')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length ? customers.map((customer) => (
                <TableRow
                  aria-label={t('openCustomerDetails', { name: customer.full_name?.trim() || customer.email || customer.id.slice(0, 8) })}
                  className="cursor-pointer"
                  key={customer.id}
                  onClick={() => router.push(`/admin/customers/${customer.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      router.push(`/admin/customers/${customer.id}`);
                    }
                  }}
                  role="link"
                  tabIndex={0}
                >
                  <TableCell><Link className="font-mono text-xs underline-offset-4 hover:underline" href={`/admin/customers/${customer.id}`} onClick={(event) => event.stopPropagation()}>{customer.id.slice(0, 8)}</Link></TableCell>
                  <TableCell className="font-medium">{customer.full_name?.trim() || common('noData')}</TableCell>
                  <TableCell>{customer.email ?? common('noData')}</TableCell>
                  <TableCell>{translateGender(customer.gender)}</TableCell>
                  <TableCell>{translateAge(customer.age_group)}</TableCell>
                  <TableCell>{translateLogin(customer.latest_login_method)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(customer.registered_at)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(customer.last_visit_at)}</TableCell>
                  <TableCell>{customer.total_sessions}</TableCell>
                  <TableCell>{formatDuration(customer.total_duration_min)}</TableCell>
                  <TableCell>
                    <Badge variant={customer.marketing_consented ? 'default' : 'secondary'}>
                      {customer.marketing_consented === null
                        ? common('noData')
                        : customer.marketing_consented ? t('subscribed') : t('declined')}
                    </Badge>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell className="h-24 text-center" colSpan={11}>{common('noData')}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <Pagination
          endRecord={endRecord}
          page={page}
          startRecord={startRecord}
          totalCount={count ?? 0}
          totalPages={totalPages}
          onPage={(nextPage) => updateParams({ page: String(nextPage) })}
        />
      </div>
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  allLabel,
  onChange,
  children
}: {
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
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {children}
        </SelectContent>
      </Select>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  startRecord,
  endRecord,
  totalCount,
  onPage
}: {
  page: number;
  totalPages: number;
  startRecord: number;
  endRecord: number;
  totalCount: number;
  onPage: (page: number) => void;
}) {
  const t = useTranslations('admin');
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
      <p className="text-sm text-muted-foreground">{t('paginationSummary', { start: startRecord, end: endRecord, total: totalCount })}</p>
      <div className="flex gap-2">
        <Button disabled={page <= 1} onClick={() => onPage(page - 1)} type="button" variant="outline">{t('previous')}</Button>
        <span className="flex items-center px-2 text-sm">{t('pageSummary', { page, total: totalPages })}</span>
        <Button disabled={page >= totalPages} onClick={() => onPage(page + 1)} type="button" variant="outline">{t('next')}</Button>
      </div>
    </div>
  );
}
