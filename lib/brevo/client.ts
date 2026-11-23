import 'server-only';

import { BrevoClient } from '@getbrevo/brevo';

export type SendEmailInput = { to: string; subject: string; htmlContent: string };
export type SendEmailResult = { id: string | null; error: { message: string; statusCode?: number } | null };

let brevoClient: BrevoClient | null = null;

function getBrevoClient() {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY is not configured.');
  brevoClient ??= new BrevoClient({ apiKey });
  return brevoClient;
}

export async function sendEmail({ to, subject, htmlContent }: SendEmailInput): Promise<SendEmailResult> {
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!senderEmail) {
    return { id: null, error: { message: 'BREVO_SENDER_EMAIL is not configured.' } };
  }

  try {
    const response = await getBrevoClient().transactionalEmails.sendTransacEmail({
      subject,
      htmlContent,
      sender: { name: 'Katinat Saigon Cafe', email: senderEmail },
      to: [{ email: to }]
    });
    return { id: response.messageId ?? null, error: null };
  } catch (error) {
    const responseError = error as { message?: unknown; statusCode?: unknown };
    const statusCode = typeof responseError.statusCode === 'number' ? responseError.statusCode : undefined;
    const message = typeof responseError.message === 'string' ? responseError.message : 'Email delivery failed.';
    return { id: null, error: { message, ...(statusCode ? { statusCode } : {}) } };
  }
}
