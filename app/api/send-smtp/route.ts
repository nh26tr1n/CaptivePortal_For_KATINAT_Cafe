import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { normalizeEmailHtml } from '@/lib/email/normalizeHtml';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BATCH_SIZE = 20;
const bodySchema = z.object({
  senderEmail: z.string().trim().email().max(254),
  appPassword: z.string().min(12).max(64),
  subject: z.string().trim().min(1).max(200),
  html: z.string().trim().min(1).max(50_000),
  recipients: z.array(z.object({
    name: z.string().trim().min(1).max(200),
    email: z.string().trim().email().max(254),
    consent: z.string()
  }).strict()).min(1).max(BATCH_SIZE)
}).strict();

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function isConsented(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === 'yes';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getSmtpErrorDetails(error: unknown) {
  if (!(error instanceof Error)) {
    return { code: 'unknown', command: null, responseCode: null, message: String(error) };
  }

  const smtpError = error as NodeJS.ErrnoException & { command?: string; responseCode?: number };
  return {
    code: smtpError.code ?? 'unknown',
    command: smtpError.command ?? null,
    responseCode: smtpError.responseCode ?? null,
    message: error.message
  };
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'invalid_origin' }, { status: 403 });
  }

  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const { senderEmail, appPassword, subject, html, recipients } = parsed.data;
  const eligibleRecipients = recipients.filter((recipient) => isConsented(recipient.consent));
  if (!eligibleRecipients.length) {
    return NextResponse.json({ error: 'no_consented_recipients' }, { status: 400 });
  }

  const smtp = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: senderEmail, pass: appPassword.replace(/\s+/g, '') },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000
  });

  try {
    await smtp.verify();
  } catch (error) {
    const details = getSmtpErrorDetails(error);
    const authenticationError = details.code === 'EAUTH';
    console.error('[POST /api/send-smtp] SMTP verification failed', details);
    smtp.close();
    return NextResponse.json(
      { error: authenticationError ? 'smtp_auth_failed' : 'smtp_connection_failed' },
      { status: 502 }
    );
  }

  try {
    const supabase = await createClient();

    const emails = [...new Set(eligibleRecipients.map((recipient) => recipient.email.trim()))];
    const { data: customerRows, error: consentError } = await supabase
      .from('admin_customer_overview')
      .select('email, marketing_consented')
      .in('email', emails);

    if (consentError) {
      console.error('[POST /api/send-smtp] Could not verify current marketing consent', {
        code: consentError.code,
        message: consentError.message
      });
      return NextResponse.json({ error: 'consent_lookup_failed' }, { status: 503 });
    }

    const consentByEmail = new Map<string, boolean>();
    for (const customer of customerRows ?? []) {
      if (!customer.email) continue;
      const key = customer.email.trim().toLowerCase();
      const currentlyConsented = customer.marketing_consented === true;
      consentByEmail.set(key, (consentByEmail.get(key) ?? true) && currentlyConsented);
    }

    let sent = 0;
    let failed = 0;
    let skipped = recipients.length - eligibleRecipients.length;
    const htmlTemplate = normalizeEmailHtml(html);

    for (let index = 0; index < eligibleRecipients.length; index += 1) {
      const recipient = eligibleRecipients[index];
      const normalizedEmail = recipient.email.trim().toLowerCase();
      if (consentByEmail.get(normalizedEmail) !== true) {
        skipped += 1;
        continue;
      }

      try {
        const personalizedHtml = htmlTemplate.replace(/\{\{\s*name\s*\}\}/gi, escapeHtml(recipient.name.trim()));
        await smtp.sendMail({
          from: senderEmail,
          to: recipient.email.trim(),
          subject,
          html: personalizedHtml
        });
        sent += 1;
      } catch (error) {
        failed += 1;
        console.error('[POST /api/send-smtp] Email delivery failed', getSmtpErrorDetails(error));
      }

      if (index < eligibleRecipients.length - 1) await wait(200);
    }

    return NextResponse.json({ sent, failed, skipped });
  } catch (error) {
    console.error('[POST /api/send-smtp] Unexpected marketing email failure', getSmtpErrorDetails(error));
    return NextResponse.json({ error: 'database_unavailable' }, { status: 503 });
  } finally {
    smtp.close();
  }
}
