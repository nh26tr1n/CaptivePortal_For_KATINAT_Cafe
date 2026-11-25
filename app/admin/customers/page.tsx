import { getTranslations } from 'next-intl/server';
import { CustomersTable } from '@/components/admin/CustomersTable';
import { getAdminCustomers } from '@/lib/services/customer.service';

type PageProps = { searchParams?: Record<string, string | string[] | undefined> };
const PAGE_SIZE = 20;

function param(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : '';
}

function pageNumber(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 100_000) : 1;
}

export default async function CustomersPage({ searchParams = {} }: PageProps) {
  const t = await getTranslations('admin');
  const filters = {
    search: param(searchParams.q).trim(),
    gender: param(searchParams.gender),
    ageGroup: param(searchParams.age_group),
    loginMethod: param(searchParams.login_method),
    visitType: param(searchParams.visit)
  };
  const page = pageNumber(param(searchParams.page));
  const result = await getAdminCustomers(filters, page, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('customersPageTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('customersPageDescription')}</p>
      </div>
      <CustomersTable
        count={result.count}
        customers={result.customers}
        filters={filters}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
