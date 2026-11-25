import { createClient } from '@/lib/supabase/server';
import type { DevicePreview, SessionFilters, SessionListItem, SessionPage, SessionRow } from '@/types';

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
