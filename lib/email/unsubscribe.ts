import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

function signingSecret() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Unsubscribe signing secret is not configured.');
  return secret;
}

function signature(customerId: string, campaignId: string) {
  return createHmac('sha256', signingSecret()).update(`${customerId}:${campaignId}`).digest('base64url');
}

export function createUnsubscribeToken(customerId: string, campaignId: string) {
  return `${customerId}.${campaignId}.${signature(customerId, campaignId)}`;
}

export function verifyUnsubscribeToken(token: string) {
  const [customerId, campaignId, suppliedSignature, ...extra] = token.split('.');
  if (extra.length || !/^[0-9a-f-]{36}$/i.test(customerId ?? '') || !/^[0-9a-f-]{36}$/i.test(campaignId ?? '') || !suppliedSignature) return null;

  const expected = Buffer.from(signature(customerId, campaignId));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  return { customerId, campaignId };
}

export function getUnsubscribeUrl(customerId: string, campaignId: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL is not configured.');
  const url = new URL('/api/unsubscribe', appUrl);
  url.searchParams.set('token', createUnsubscribeToken(customerId, campaignId));
  return url.toString();
}
