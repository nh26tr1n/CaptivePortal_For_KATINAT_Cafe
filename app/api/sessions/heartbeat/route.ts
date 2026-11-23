import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const heartbeatSchema = z.object({ session_id: z.string().uuid() }).strict();

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const parsed = heartbeatSchema.safeParse(body);
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
    const { data, error } = await admin
      .from('wifi_sessions')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', parsed.data.session_id)
      .eq('customer_id', user.id)
      .eq('status', 'online')
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[PATCH /api/sessions/heartbeat] Update failed', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return NextResponse.json({ ok: false, error: 'heartbeat_failed' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: 'session_not_found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[PATCH /api/sessions/heartbeat] Request failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error)
    });
    if (error instanceof Error && error.message === 'Supabase admin environment variables are not configured.') {
      return NextResponse.json({ ok: false, error: 'admin_config_missing' }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: 'heartbeat_failed' }, { status: 500 });
  }
}
