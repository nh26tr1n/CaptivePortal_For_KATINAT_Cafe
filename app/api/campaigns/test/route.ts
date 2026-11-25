import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { sendEmail } from '@/lib/brevo/client';
import { campaignContentSchema } from '@/lib/validations';

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user?.email) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }
  const parsed = campaignContentSchema.omit({ recipient_ids: true }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'invalid_campaign' }, { status: 400 });

  const result = await sendEmail({ to: user.email, subject: `[Test] ${parsed.data.subject}`, htmlContent: parsed.data.html_content });
  if (result.error) {
    // Keep provider diagnostics on the server; never return credentials to the browser.
    console.error('[campaign-test-email] Brevo delivery failed', {
      statusCode: result.error.statusCode ?? null,
      message: result.error.message
    });
    return NextResponse.json({
      ok: false,
      error: 'email_send_failed',
      provider: 'brevo',
      provider_status: result.error.statusCode ?? null
    }, { status: result.error.statusCode === 429 ? 429 : 502 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}
