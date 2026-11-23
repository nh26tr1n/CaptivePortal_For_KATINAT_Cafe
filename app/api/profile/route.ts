import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

const profileSchema = z.object({
  full_name: z.string().trim().max(100).optional(),
  gender: z.enum(['male', 'female', 'other', 'undisclosed']).optional(),
  age_group: z.enum(['under_18', '18_24', '25_34', '35_44', '45_54', '55_plus', 'undisclosed']).optional()
}).strict();

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(parsed.data as Database['public']['Tables']['profiles']['Update'])
      .eq('id', user.id)
      .select('id')
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: 'profile_update_failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'profile_update_failed' }, { status: 500 });
  }
}
