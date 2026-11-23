import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { campaignContentSchema } from '@/lib/validations/campaign';

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }
  const parsed = campaignContentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'invalid_campaign' }, { status: 400 });

  const customerIds = [...new Set(parsed.data.recipient_ids)];
  const admin = createAdminClient();
  const { data: profiles, error: profilesError } = customerIds.length
    ? await admin.from('profiles').select('id, email').in('id', customerIds).eq('role', 'customer').not('email', 'is', null)
    : { data: [], error: null };
  if (profilesError) return NextResponse.json({ ok: false, error: 'recipient_lookup_failed' }, { status: 500 });

  const latestConsent = new Map<string, boolean>();
  for (let offset = 0; offset < customerIds.length; offset += 100) {
    const chunk = customerIds.slice(offset, offset + 100);
    for (let consentOffset = 0; ; consentOffset += 1000) {
      const { data, error } = await admin.from('marketing_consents').select('customer_id, consented, created_at')
        .in('customer_id', chunk).order('created_at', { ascending: false }).order('id', { ascending: false })
        .range(consentOffset, consentOffset + 999);
      if (error) return NextResponse.json({ ok: false, error: 'recipient_lookup_failed' }, { status: 500 });
      for (const consent of data ?? []) {
        if (!latestConsent.has(consent.customer_id)) latestConsent.set(consent.customer_id, consent.consented);
      }
      if (!data || data.length < 1000) break;
    }
  }
  const eligibleProfiles = (profiles ?? []).filter((profile) => latestConsent.get(profile.id) === true && profile.email);
  if (eligibleProfiles.length !== customerIds.length) {
    return NextResponse.json({ ok: false, error: 'recipients_changed' }, { status: 409 });
  }

  const { data: campaign, error: campaignError } = await admin.from('email_campaigns').insert({
    name: parsed.data.name,
    subject: parsed.data.subject,
    html_content: parsed.data.html_content,
    status: 'draft'
  }).select('id').single();
  if (campaignError || !campaign) return NextResponse.json({ ok: false, error: 'campaign_save_failed' }, { status: 500 });

  const { error: recipientsError } = eligibleProfiles.length
    ? await admin.from('email_recipients').insert(eligibleProfiles.map((profile) => ({
        campaign_id: campaign.id,
        customer_id: profile.id,
        email: profile.email as string,
        status: 'pending' as const
      })))
    : { error: null };
  if (recipientsError) {
    await admin.from('email_campaigns').delete().eq('id', campaign.id);
    return NextResponse.json({ ok: false, error: 'campaign_save_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, campaign_id: campaign.id });
}
