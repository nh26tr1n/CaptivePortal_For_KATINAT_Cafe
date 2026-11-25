import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';
import { voucherRedemptionSchema } from '@/lib/validations';

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }
  const parsed = voucherRedemptionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400 });

  const admin = createAdminClient();
  const email = parsed.data.customer_email.toLowerCase();
  const { data: customer, error: customerError } = await admin.from('profiles')
    .select('id, email').eq('email', email).eq('role', 'customer').maybeSingle();
  if (customerError) return NextResponse.json({ ok: false, error: 'customer_lookup_failed' }, { status: 500 });
  if (!customer) return NextResponse.json({ ok: false, error: 'customer_not_found' }, { status: 404 });

  const { data, error } = await admin.rpc('redeem_voucher', {
    p_code: parsed.data.code.trim().toUpperCase(),
    p_customer_id: customer.id
  });
  if (error) return NextResponse.json({ ok: false, error: 'redemption_failed' }, { status: 500 });

  const result = record(data);
  if (!result?.ok) {
    const failure = typeof result?.error === 'string' ? result.error : 'redemption_failed';
    const status = failure === 'not_found' ? 404 : failure === 'already_redeemed' ? 409 : 400;
    return NextResponse.json({ ok: false, error: failure }, { status });
  }
  const usedCount = typeof result.used_count === 'number' ? result.used_count : null;
  return NextResponse.json({ ok: true, used_count: usedCount, customer_email: customer.email });
}
