import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) {
    return NextResponse.json({ ok: false, error: 'invalid_voucher' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { count, error: redemptionError } = await admin
      .from('voucher_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('voucher_id', params.id);
    if (redemptionError) {
      console.error('[DELETE /api/vouchers/[id]] Could not check voucher redemptions', redemptionError);
      return NextResponse.json({ ok: false, error: 'redemption_check_failed' }, { status: 500 });
    }
    if ((count ?? 0) > 0) {
      return NextResponse.json({ ok: false, error: 'voucher_has_redemptions' }, { status: 409 });
    }

    const { error } = await admin.from('vouchers').delete().eq('id', params.id);
    if (error) {
      console.error('[DELETE /api/vouchers/[id]] Could not delete voucher', error);
      return NextResponse.json({ ok: false, error: 'voucher_delete_failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[DELETE /api/vouchers/[id]] Unexpected delete failure', error);
    return NextResponse.json({ ok: false, error: 'voucher_delete_failed' }, { status: 500 });
  }
}
