import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export type SessionFilters = {
  search?: string;
  status?: string;
  loginMethod?: string;
  deviceType?: string;
  fromTimestamp?: string;
  toExclusiveTimestamp?: string;
};

type SessionRow = Database['public']['Tables']['wifi_sessions']['Row'];
type ProfilePreview = Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'email' | 'full_name'>;
type DevicePreview = Pick<Database['public']['Tables']['devices']['Row'], 'id' | 'device_type' | 'device_fingerprint'>;

export type SessionListItem = SessionRow & {
  customer: ProfilePreview | null;
  device: DevicePreview | null;
};

export type SessionPage = {
  sessions: SessionListItem[];
  count: number | null;
};

export async function getAdminSessions(filters: SessionFilters, page: number, pageSize: number): Promise<SessionPage> {
  const supabase = await createClient();
  const safeSearch = filters.search?.replace(/[,%()\\]/g, ' ').trim();
  const customerJoin = safeSearch ? '!inner' : '';
  const deviceJoin = filters.deviceType ? '!inner' : '';
  let query = supabase
    .from('wifi_sessions')
    .select(`
      *,
      customer:profiles!wifi_sessions_customer_id_fkey${customerJoin}(id, email, full_name),
      device:devices!wifi_sessions_device_id_fkey${deviceJoin}(id, device_type, device_fingerprint)
    `, { count: 'exact' })
    .order('started_at', { ascending: false });

  if (safeSearch) query = query.ilike('customer.email', `%${safeSearch}%`);
  if (filters.status) query = query.eq('status', filters.status as SessionRow['status']);
  if (filters.loginMethod) query = query.eq('login_method', filters.loginMethod as SessionRow['login_method']);
  if (filters.deviceType) {
    query = query.eq('device.device_type', filters.deviceType as DevicePreview['device_type']);
  }
  if (filters.fromTimestamp) query = query.gte('started_at', filters.fromTimestamp);
  if (filters.toExclusiveTimestamp) query = query.lt('started_at', filters.toExclusiveTimestamp);

  const start = (page - 1) * pageSize;
  const { data, count, error } = await query.range(start, start + pageSize - 1);
  if (error) throw new Error(`Could not load admin sessions: ${error.message}`);

  return {
    sessions: (data ?? []) as unknown as SessionListItem[],
    count
  };
}
