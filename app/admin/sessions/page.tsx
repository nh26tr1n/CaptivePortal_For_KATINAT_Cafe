import { getTranslations } from 'next-intl/server';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { SessionsTable } from '@/components/admin/SessionsTable';
import { resolveDateRange } from '@/lib/services/date-range';
import { getAdminSessions } from '@/lib/services/session.service';

type PageProps = { searchParams?: Record<string, string | string[] | undefined> };
const PAGE_SIZE = 20;

function param(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : '';
}

function pageNumber(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 100_000) : 1;
}

export default async function SessionsPage({ searchParams = {} }: PageProps) {
  const t = await getTranslations('admin');
  const range = resolveDateRange(searchParams);
  const filters = {
    search: param(searchParams.q).trim(),
    status: param(searchParams.status),
    loginMethod: param(searchParams.login_method),
    deviceType: param(searchParams.device_type),
    fromTimestamp: range.fromTimestamp,
    toExclusiveTimestamp: range.toExclusiveTimestamp
  };
  const page = pageNumber(param(searchParams.page));
  const result = await getAdminSessions(filters, page, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('sessionsPageTitle')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('sessionsPageDescription')}</p>
        </div>
        <DateRangeFilter fromDate={range.fromDate} preset={range.preset} toDate={range.toDate} />
      </div>
      <SessionsTable
        count={result.count}
        filters={{ search: filters.search, status: filters.status, loginMethod: filters.loginMethod, deviceType: filters.deviceType }}
        page={page}
        pageSize={PAGE_SIZE}
        sessions={result.sessions}
      />
    </div>
  );
}
