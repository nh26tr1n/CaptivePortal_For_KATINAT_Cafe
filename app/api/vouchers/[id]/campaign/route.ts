import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';
import { voucherCampaignSchema } from '@/lib/validations';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }
  const parsed = voucherCampaignSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'invalid_campaign' }, { status: 400 });

  const admin = createAdminClient();
  const [{ data: voucher, error: voucherError }, { data: campaign, error: campaignError }] = await Promise.all([
    admin.from('vouchers').select('id, code').eq('id', params.id).maybeSingle(),
    admin.from('email_campaigns').select('id, html_content, status').eq('id', parsed.data.campaign_id).maybeSingle()
  ]);
  if (voucherError || campaignError) return NextResponse.json({ ok: false, error: 'lookup_failed' }, { status: 500 });
  if (!voucher || !campaign) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  if (campaign.status !== 'draft') return NextResponse.json({ ok: false, error: 'campaign_not_draft' }, { status: 409 });

  const marker = '{{voucher_code}}';
  const htmlContent = campaign.html_content.includes(marker)
    ? campaign.html_content
    : `${campaign.html_content}\n<p>${marker}</p>`;
  const { data: updated, error: updateError } = await admin.from('email_campaigns').update({ voucher_id: voucher.id, html_content: htmlContent })
    .eq('id', campaign.id).eq('status', 'draft').select('id').maybeSingle();
  if (updateError) return NextResponse.json({ ok: false, error: 'campaign_update_failed' }, { status: 500 });
  if (!updated) return NextResponse.json({ ok: false, error: 'campaign_not_draft' }, { status: 409 });
  return NextResponse.json({ ok: true, voucher_code: voucher.code });
}
