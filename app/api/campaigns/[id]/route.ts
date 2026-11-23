import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  const admin = createAdminClient();
  const { data: campaign, error: lookupError } = await admin.from('email_campaigns').select('id, status').eq('id', params.id).maybeSingle();
  if (lookupError || !campaign) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  if (campaign.status === 'sending') {
    return NextResponse.json({ ok: false, error: 'campaign_cannot_delete' }, { status: 409 });
  }

  const { error } = await admin.from('email_campaigns').delete().eq('id', params.id);
  if (error) return NextResponse.json({ ok: false, error: 'campaign_delete_failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
