import type { User } from '@supabase/supabase-js';
import type { Database } from '@/types';
import { createClient } from '@/lib/supabase/server';

type Profile = Database['public']['Tables']['profiles']['Row'];

export type CurrentUser = {
  user: User | null;
  profile: Profile | null;
};

export async function getUser(): Promise<CurrentUser> {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { user: null, profile: null };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    return { user: authData.user, profile };
  } catch {
    return { user: null, profile: null };
  }
}
