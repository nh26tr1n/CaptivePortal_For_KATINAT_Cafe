import { NextResponse } from 'next/server';
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe';
import { createAdminClient } from '@/lib/supabase/admin';
import messagesEn from '@/locales/en.json';
import messagesVi from '@/locales/vi.json';

const CONSENT_VERSION = 'v1-2026-11';

function responsePage(title: string, message: string, locale: 'vi' | 'en', status = 200) {
  const html = `<!doctype html><html lang="${locale}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:Arial,sans-serif;background:#f6f3ef;color:#29231f;padding:48px 16px"><main style="max-width:560px;margin:auto;background:white;border-radius:12px;padding:32px"><h1>${title}</h1><p>${message}</p></main></body></html>`;
  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export async function GET(request: Request) {
  const isEnglish = request.headers.get('accept-language')?.toLowerCase().startsWith('en');
  const common = isEnglish ? messagesEn.common : messagesVi.common;
  const locale = isEnglish ? 'en' : 'vi';
  const title = common.emailPreferences;
  const token = new URL(request.url).searchParams.get('token');
  const verified = token ? verifyUnsubscribeToken(token) : null;
  if (!verified) return responsePage(title, common.unsubscribeInvalid, locale, 400);

  const admin = createAdminClient();
  const [{ data: recipient }, { data: profile }] = await Promise.all([
    admin.from('email_recipients').select('id').eq('campaign_id', verified.campaignId).eq('customer_id', verified.customerId).maybeSingle(),
    admin.from('profiles').select('id').eq('id', verified.customerId).maybeSingle()
  ]);
  if (!recipient || !profile) return responsePage(title, common.unsubscribeCustomerMissing, locale, 404);

  const { error } = await admin.from('marketing_consents').insert({
    customer_id: verified.customerId,
    consented: false,
    source: 'unsubscribe_link',
    consent_version: CONSENT_VERSION
  });
  if (error) return responsePage(title, common.unsubscribeSaveError, locale, 500);

  return responsePage(title, common.unsubscribeSuccess, locale);
}
