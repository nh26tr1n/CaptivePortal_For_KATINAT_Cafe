import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const endSessionSchema = z.object({
  session_id: z.string().uuid(),
  reason: z.enum(['logout', 'tab_close', 'timeout'])
}).strict();

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const parsed = endSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: session, error: lookupError } = await admin
      .from('wifi_sessions')
      .select('id, status')
      .eq('id', parsed.data.session_id)
      .eq('customer_id', user.id)
      .maybeSingle();

    if (lookupError) {
      console.error('[POST /api/sessions/end] Session lookup failed', {
        code: lookupError.code,
        message: lookupError.message,
        details: lookupError.details,
        hint: lookupError.hint
      });
      return NextResponse.json({ ok: false, error: 'session_lookup_failed' }, { status: 500 });
    }
    if (!session) {
      return NextResponse.json({ ok: false, error: 'session_not_found' }, { status: 404 });
    }
    if (session.status !== 'online') {
      return NextResponse.json({ ok: true });
    }

    const endedAt = new Date().toISOString();
    const { error } = await admin
      .from('wifi_sessions')
      .update({ status: 'offline', ended_at: endedAt, end_reason: parsed.data.reason })
      .eq('id', session.id)
      .eq('customer_id', user.id)
      .eq('status', 'online');

    if (error) {
      console.error('[POST /api/sessions/end] Session update failed', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return NextResponse.json({ ok: false, error: 'session_end_failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[POST /api/sessions/end] Request failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error)
    });
    if (error instanceof Error && error.message === 'Supabase admin environment variables are not configured.') {
      return NextResponse.json({ ok: false, error: 'admin_config_missing' }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: 'session_end_failed' }, { status: 500 });
  }
}
