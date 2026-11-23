import 'server-only';

import { createClient } from '@/lib/supabase/server';

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) {
    console.error('[auth] failed to load admin profile', { code: profileError.code });
    return null;
  }
  if (profile?.role !== 'admin') return null;

  return user;
}
