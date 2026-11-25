import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createClient } from '@/lib/supabase/server';
import type { CustomerSummary } from '@/types';

const PAGE_SIZE = 1000;

export const dynamic = 'force-dynamic';

function protectSpreadsheetFormula(value: string | null) {
  if (value === null) return '';
  return /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const supabase = await createClient();
    const customers: CustomerSummary[] = [];

    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('admin_customer_overview')
        .select('id, email, full_name, gender, age_group, registered_at, latest_login_method, last_visit_at, total_sessions, total_duration_min, marketing_consented, is_returning')
        .eq('marketing_consented', true)
        .not('full_name', 'is', null)
        .neq('full_name', '')
        .not('email', 'is', null)
        .neq('email', '')
        .order('registered_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error('[GET /api/admin/export-csv] Customer export query failed', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return NextResponse.json({ error: 'export_failed' }, { status: 500 });
      }

      customers.push(...(data ?? []).filter((customer) => Boolean(customer.full_name?.trim() && customer.email?.trim())));
      if (!data || data.length < PAGE_SIZE) break;
    }

    if (!customers.length) {
      return NextResponse.json({ error: 'no_consented_customers' }, { status: 404 });
    }

    const csv = Papa.unparse(customers.map((customer) => ({
      name: protectSpreadsheetFormula(customer.full_name?.trim() ?? null),
      email: protectSpreadsheetFormula(customer.email?.trim() ?? null),
      consent: 'yes'
    })));

    return new Response(`\ufeff${csv}`, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="katinat-marketing-consented.csv"',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('[GET /api/admin/export-csv] Export failed', {
      message: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ error: 'export_failed' }, { status: 500 });
  }
}
