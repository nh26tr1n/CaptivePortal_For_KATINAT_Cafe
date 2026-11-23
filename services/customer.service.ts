import type { Database } from '@/types/database';
import { createClient } from '@/lib/supabase/server';

export type CustomerSummary = Database['public']['Views']['admin_customer_overview']['Row'];
export type CustomerFilters = {
  search?: string;
  gender?: string;
  ageGroup?: string;
  loginMethod?: string;
  visitType?: string;
};

export type CustomerPage = {
  customers: CustomerSummary[];
  count: number | null;
};

export type AdminDevice = Database['public']['Tables']['devices']['Row'] & {
  customer: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'email'> | null;
  sessionCount: number;
};

export type CustomerDetails = {
  customer: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'email' | 'full_name' | 'gender' | 'age_group' | 'created_at' | 'updated_at'>;
  sessions: Database['public']['Tables']['wifi_sessions']['Row'][];
  devices: Database['public']['Tables']['devices']['Row'][];
  consents: Database['public']['Tables']['marketing_consents']['Row'][];
};

export async function getAdminCustomers(filters: CustomerFilters, page: number, pageSize: number): Promise<CustomerPage> {
  const supabase = await createClient();
  let query = supabase
    .from('admin_customer_overview')
    .select('*', { count: 'exact' })
    .order('registered_at', { ascending: false });

  if (filters.search) {
    const safeSearch = filters.search.replace(/[,%()\\]/g, ' ').trim();
    if (safeSearch) query = query.or(`full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
  }
  if (filters.gender) query = query.eq('gender', filters.gender as Exclude<CustomerSummary['gender'], null>);
  if (filters.ageGroup) query = query.eq('age_group', filters.ageGroup as Exclude<CustomerSummary['age_group'], null>);
  if (filters.loginMethod) {
    query = query.eq('latest_login_method', filters.loginMethod as Exclude<CustomerSummary['latest_login_method'], null>);
  }
  if (filters.visitType === 'new') query = query.eq('is_returning', false);
  if (filters.visitType === 'returning') query = query.eq('is_returning', true);

  const start = (page - 1) * pageSize;
  const { data, count, error } = await query.range(start, start + pageSize - 1);
  if (error) throw new Error(`Could not load admin customers: ${error.message}`);
  return { customers: data ?? [], count };
}

export async function getAdminCustomerDetails(customerId: string): Promise<CustomerDetails | null> {
  const supabase = await createClient();
  const { data: customer, error: customerError } = await supabase
    .from('profiles')
    .select('id, email, full_name, gender, age_group, created_at, updated_at')
    .eq('id', customerId)
    .eq('role', 'customer')
    .maybeSingle();

  if (customerError || !customer) return null;

  const [sessionsResult, devicesResult, consentsResult] = await Promise.all([
    supabase.from('wifi_sessions').select('*').eq('customer_id', customerId).order('started_at', { ascending: false }),
    supabase.from('devices').select('*').eq('customer_id', customerId).order('last_seen', { ascending: false }),
    supabase.from('marketing_consents').select('*').eq('customer_id', customerId).order('created_at', { ascending: false })
  ]);

  return {
    customer,
    sessions: sessionsResult.error ? [] : sessionsResult.data ?? [],
    devices: devicesResult.error ? [] : devicesResult.data ?? [],
    consents: consentsResult.error ? [] : consentsResult.data ?? []
  };
}

export async function getAdminDevices(): Promise<AdminDevice[]> {
  const supabase = await createClient();
  const { data: devices, error } = await supabase
    .from('devices')
    .select('*')
    .order('last_seen', { ascending: false })
    .limit(100);

  if (error || !devices?.length) return [];

  const customerIds = [...new Set(devices.map((device) => device.customer_id))];
  const deviceIds = devices.map((device) => device.id);
  const [profilesResult, sessionsResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email').in('id', customerIds),
    supabase.from('wifi_sessions').select('device_id').in('device_id', deviceIds)
  ]);
  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const sessionCounts = new Map<string, number>();
  for (const session of sessionsResult.data ?? []) {
    sessionCounts.set(session.device_id, (sessionCounts.get(session.device_id) ?? 0) + 1);
  }

  return devices.map((device) => ({
    ...device,
    customer: profiles.get(device.customer_id) ?? null,
    sessionCount: sessionCounts.get(device.id) ?? 0
  }));
}
