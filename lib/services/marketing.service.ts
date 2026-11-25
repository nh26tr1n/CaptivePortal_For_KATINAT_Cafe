import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type {
  CampaignDetails,
  CampaignListItem,
  CampaignRecipient,
  ConsentedRecipient,
  ProfileContact
} from '@/types';

export async function getConsentedRecipients(): Promise<ConsentedRecipient[]> {
  const supabase = await createClient();
  const profiles: ProfileContact[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from('profiles').select('id, email, full_name')
      .eq('role', 'customer').not('email', 'is', null).order('created_at', { ascending: false }).range(offset, offset + 999);
    if (error) return [];
    profiles.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const latestConsent = new Map<string, boolean>();
  for (let offset = 0; offset < profiles.length; offset += 100) {
    const customerIds = profiles.slice(offset, offset + 100).map((profile) => profile.id);
    for (let consentOffset = 0; ; consentOffset += 1000) {
      const { data, error } = await supabase.from('marketing_consents').select('customer_id, consented, created_at')
        .in('customer_id', customerIds).order('created_at', { ascending: false }).order('id', { ascending: false })
        .range(consentOffset, consentOffset + 999);
      if (error) return [];
      for (const consent of data ?? []) {
        if (!latestConsent.has(consent.customer_id)) latestConsent.set(consent.customer_id, consent.consented);
      }
      if (!data || data.length < 1000) break;
    }
  }
  return profiles.filter((profile) => latestConsent.get(profile.id) === true && Boolean(profile.email));
}

export async function getCampaigns(): Promise<CampaignListItem[]> {
  const supabase = await createClient();
  const { data: campaigns, error } = await supabase.from('email_campaigns').select('*').order('created_at', { ascending: false });
  if (error || !campaigns?.length) return [];

  return Promise.all(campaigns.map(async (campaign) => {
    const { count } = await supabase.from('email_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', campaign.id);
    return { ...campaign, recipient_count: count ?? 0 };
  }));
}

export async function getCampaignDetails(campaignId: string): Promise<CampaignDetails | null> {
  const supabase = await createClient();
  const { data: campaign, error } = await supabase.from('email_campaigns').select('*').eq('id', campaignId).maybeSingle();
  if (error || !campaign) return null;

  const recipients: CampaignRecipient[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error: recipientsError } = await supabase
      .from('email_recipients')
      .select('*, customer:profiles!email_recipients_customer_id_fkey(id, full_name, email), email_logs(*)')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .range(offset, offset + 499);
    if (recipientsError) return { campaign, recipients: [] };
    recipients.push(...((data ?? []) as unknown as CampaignRecipient[]));
    if (!data || data.length < 500) break;
  }
  return { campaign, recipients };
}
