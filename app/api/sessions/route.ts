import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const createSessionSchema = z.object({
  login_method: z.enum(['google', 'facebook', 'email']),
  device_fingerprint: z.string().trim().min(1).max(256),
  device_type: z.enum(['iphone', 'android', 'laptop', 'tablet', 'unknown']),
  hotspot_id: z.string().uuid().optional()
}).strict();

type SessionResult = { session_id: string; started_at: string };

async function findOnlineSession(admin: ReturnType<typeof createAdminClient>, customerId: string, deviceId: string) {
  return admin
    .from('wifi_sessions')
    .select('id, started_at')
    .eq('customer_id', customerId)
    .eq('device_id', deviceId)
    .eq('status', 'online')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

function sessionResponse(session: { id: string; started_at: string }, status = 200) {
  const body: SessionResult = { session_id: session.id, started_at: session.started_at };
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  try {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();
    const userAgent = request.headers.get('user-agent');

    const { data: device, error: deviceError } = await admin
      .from('devices')
      .upsert({
        customer_id: user.id,
        device_fingerprint: parsed.data.device_fingerprint,
        device_type: parsed.data.device_type,
        user_agent: userAgent,
        last_seen: now
      }, { onConflict: 'customer_id,device_fingerprint' })
      .select('id')
      .single();

    if (deviceError || !device) {
      console.error('[POST /api/sessions] Device upsert failed', {
        code: deviceError?.code,
        message: deviceError?.message,
        details: deviceError?.details,
        hint: deviceError?.hint
      });
      if (deviceError?.code === '42P10') {
        return NextResponse.json({ error: 'session_schema_not_ready' }, { status: 503 });
      }
      return NextResponse.json({ error: 'device_write_failed' }, { status: 500 });
    }

    const { data: existing, error: existingError } = await findOnlineSession(admin, user.id, device.id);
    if (existingError) {
      console.error('[POST /api/sessions] Online session lookup failed', {
        code: existingError.code,
        message: existingError.message,
        details: existingError.details,
        hint: existingError.hint
      });
      return NextResponse.json({ error: 'session_lookup_failed' }, { status: 500 });
    }
    if (existing) {
      return sessionResponse(existing);
    }

    let hotspotId = parsed.data.hotspot_id;
    if (!hotspotId) {
      const { data: hotspot, error: hotspotError } = await admin
        .from('hotspots')
        .select('id')
        .eq('ssid', 'Katinat_Guest')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (hotspotError || !hotspot) {
        if (hotspotError) {
          console.error('[POST /api/sessions] Hotspot lookup failed', {
            code: hotspotError.code,
            message: hotspotError.message,
            details: hotspotError.details,
            hint: hotspotError.hint
          });
        }
        return NextResponse.json({ error: 'hotspot_not_configured' }, { status: 503 });
      }
      hotspotId = hotspot.id;
    } else {
      const { data: hotspot, error: hotspotError } = await admin
        .from('hotspots')
        .select('id')
        .eq('id', hotspotId)
        .maybeSingle();

      if (hotspotError || !hotspot) {
        if (hotspotError) {
          console.error('[POST /api/sessions] Hotspot lookup failed', {
            code: hotspotError.code,
            message: hotspotError.message,
            details: hotspotError.details,
            hint: hotspotError.hint
          });
        }
        return NextResponse.json({ error: 'hotspot_not_found' }, { status: 400 });
      }
    }

    const { data: created, error: insertError } = await admin
      .from('wifi_sessions')
      .insert({
        customer_id: user.id,
        device_id: device.id,
        hotspot_id: hotspotId,
        login_method: parsed.data.login_method,
        started_at: now,
        last_seen: now,
        status: 'online',
        download_bytes: null,
        upload_bytes: null
      })
      .select('id, started_at')
      .single();

    if (!insertError && created) {
      return sessionResponse(created, 201);
    }

    if (insertError?.code === '23505') {
      const { data: concurrentSession } = await findOnlineSession(admin, user.id, device.id);
      if (concurrentSession) {
        return sessionResponse(concurrentSession);
      }
    }

    if (insertError) {
      console.error('[POST /api/sessions] Session insert failed', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
    }

    return NextResponse.json({ error: 'session_create_failed' }, { status: 500 });
  } catch (error) {
    console.error('[POST /api/sessions] Request failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error)
    });
    if (error instanceof Error && error.message === 'Supabase admin environment variables are not configured.') {
      return NextResponse.json({ error: 'admin_config_missing' }, { status: 503 });
    }
    return NextResponse.json({ error: 'session_create_failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('wifi_sessions')
      .select('*')
      .eq('customer_id', user.id)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('[GET /api/sessions] Session list failed', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return NextResponse.json({ error: 'session_list_failed' }, { status: 500 });
    }

    return NextResponse.json({ sessions: data ?? [] });
  } catch (error) {
    console.error('[GET /api/sessions] Request failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ error: 'session_list_failed' }, { status: 500 });
  }
}
