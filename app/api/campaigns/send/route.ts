import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { getUnsubscribeUrl } from '@/lib/email/unsubscribe';
import { renderCampaignTemplate } from '@/lib/email/templates/campaign';
import { sendEmail } from '@/lib/brevo/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { campaignIdSchema } from '@/lib/validations';
import { getLocale, getTranslations } from 'next-intl/server';

export const maxDuration = 60;

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const [common, locale] = await Promise.all([getTranslations('common'), getLocale()]);

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }
  const parsed = campaignIdSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'invalid_campaign' }, { status: 400 });

  const admin = createAdminClient();
  const { data: campaign, error: campaignError } = await admin.from('email_campaigns').select('*').eq('id', parsed.data.campaign_id).maybeSingle();
  if (campaignError || !campaign) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  if (campaign.status !== 'draft') return NextResponse.json({ ok: false, error: 'campaign_not_draft' }, { status: 409 });

  let voucherCode: string | null = null;
  if (campaign.voucher_id) {
    const { data: voucher, error: voucherError } = await admin.from('vouchers').select('code').eq('id', campaign.voucher_id).maybeSingle();
    if (voucherError || !voucher) return NextResponse.json({ ok: false, error: 'voucher_lookup_failed' }, { status: 500 });
    voucherCode = voucher.code;
  }

  const { data: queue, error: queueError } = await admin.from('email_recipients')
    .select('id, customer_id, email')
    .eq('campaign_id', campaign.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (queueError) return NextResponse.json({ ok: false, error: 'recipient_query_failed' }, { status: 500 });
  if (!queue?.length) return NextResponse.json({ ok: false, error: 'no_recipients' }, { status: 409 });

  const { data: started, error: startError } = await admin.from('email_campaigns')
    .update({ status: 'sending' })
    .eq('id', campaign.id)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle();
  if (startError || !started) return NextResponse.json({ ok: false, error: 'campaign_already_started' }, { status: 409 });

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (let index = 0; index < (queue ?? []).length; index += 1) {
    const recipient = queue![index];
    let resultStatus: 'sent' | 'failed' | 'skipped' = 'failed';
    let providerMessageId: string | null = null;
    let errorMessage: string | null = null;

    try {
      const { data: latestConsent, error: consentError } = await admin.from('marketing_consents')
        .select('consented')
        .eq('customer_id', recipient.customer_id)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (consentError) {
        errorMessage = consentError.message;
      } else if (!latestConsent?.consented) {
        resultStatus = 'skipped';
      } else {
        const { data: profile, error: profileError } = await admin.from('profiles').select('full_name, email').eq('id', recipient.customer_id).maybeSingle();
        if (profileError || !profile?.email) {
          errorMessage = profileError?.message ?? 'Customer email is unavailable.';
        } else {
          const html = renderCampaignTemplate({
            content: campaign.html_content,
            name: profile.full_name,
            unsubscribeUrl: getUnsubscribeUrl(recipient.customer_id, campaign.id),
            cafeName: common('cafeName'),
            address: common('address'),
            unsubscribeLabel: common('unsubscribeLabel'),
            locale,
            voucherCode
          });
          const delivery = await sendEmail({ to: profile.email, subject: campaign.subject, htmlContent: html });
          if (delivery.error) errorMessage = delivery.error.statusCode
            ? `HTTP ${delivery.error.statusCode}: ${delivery.error.message}`
            : delivery.error.message;
          else {
            resultStatus = 'sent';
            providerMessageId = delivery.id;
          }
        }
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Email delivery failed.';
    }

    if (resultStatus === 'sent') sent += 1;
    if (resultStatus === 'failed') failed += 1;
    if (resultStatus === 'skipped') skipped += 1;

    await admin.from('email_recipients').update({
      status: resultStatus,
      error_message: resultStatus === 'failed' ? errorMessage : null
    }).eq('id', recipient.id);
    await admin.from('email_logs').insert({
      recipient_id: recipient.id,
      provider_message_id: providerMessageId,
      status: resultStatus === 'failed' && errorMessage?.includes('429') ? 'failed_429' : resultStatus,
      sent_at: resultStatus === 'sent' ? new Date().toISOString() : null
    });

    if (index < (queue?.length ?? 0) - 1) await delay(200);
  }

  const finalStatus = failed > 0 && sent === 0 && skipped === 0 ? 'failed' : 'sent';
  await admin.from('email_campaigns').update({ status: finalStatus, sent_at: finalStatus === 'sent' ? new Date().toISOString() : null }).eq('id', campaign.id);
  return NextResponse.json({ ok: true, summary: { sent, failed, skipped } });
}
