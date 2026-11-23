import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const CONSENT_VERSION = 'v1-2026-11';

const consentSchema = z.object({
  consented: z.boolean(),
  source: z.enum(['google', 'facebook', 'email'])
}).strict();

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const parsed = consentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[POST /api/consent] Missing server-side Supabase admin configuration.');
      return NextResponse.json({ ok: false, error: 'admin_config_missing' }, { status: 503 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from('marketing_consents').insert({
      customer_id: user.id,
      consented: parsed.data.consented,
      source: parsed.data.source,
      consent_version: CONSENT_VERSION
    });

    if (error) {
      console.error('[POST /api/consent] Supabase insert failed', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return NextResponse.json({ ok: false, error: 'consent_write_failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[POST /api/consent] Request failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ ok: false, error: 'consent_write_failed' }, { status: 500 });
  }
}
