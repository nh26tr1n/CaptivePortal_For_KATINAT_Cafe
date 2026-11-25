import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';
import { voucherCreateSchema } from '@/lib/validations';

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }
  const parsed = voucherCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'invalid_voucher' }, { status: 400 });

  const expiresAt = parsed.data.expires_at ? new Date(`${parsed.data.expires_at}T23:59:59.999+07:00`).toISOString() : null;
  const admin = createAdminClient();
  const { data: voucher, error } = await admin.from('vouchers').insert({
    code: parsed.data.code,
    description: parsed.data.description || null,
    discount_type: parsed.data.discount_type,
    discount_value: parsed.data.discount_value,
    max_uses: parsed.data.max_uses,
    expires_at: expiresAt,
    active: parsed.data.active
  }).select('id').single();

  if (error?.code === '23505') return NextResponse.json({ ok: false, error: 'duplicate_code' }, { status: 409 });
  if (error || !voucher) return NextResponse.json({ ok: false, error: 'voucher_save_failed' }, { status: 500 });
  return NextResponse.json({ ok: true, voucher_id: voucher.id });
}
