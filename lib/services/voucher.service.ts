import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { Database, Voucher, VoucherDetails, VoucherRedemption, VoucherStats } from '@/types';

export async function getVouchers(): Promise<{ vouchers: Voucher[] | null; stats: VoucherStats | null }> {
  const supabase = await createClient();
  const vouchers: Voucher[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('vouchers').select('*').order('created_at', { ascending: false }).range(offset, offset + 499);
    if (error) {
      console.error('[vouchers] Could not load vouchers', { code: error.code, message: error.message });
      return { vouchers: null, stats: null };
    }
    vouchers.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }

  const now = Date.now();
  const active = vouchers.filter((voucher) => voucher.active && (!voucher.expires_at || new Date(voucher.expires_at).getTime() > now)
    && (voucher.max_uses === null || voucher.used_count < voucher.max_uses)).length;
  const redeemed = vouchers.reduce((sum, voucher) => sum + voucher.used_count, 0);
  const expired = vouchers.filter((voucher) => Boolean(voucher.expires_at && new Date(voucher.expires_at).getTime() <= now)).length;
  const redeemedVouchers = vouchers.filter((voucher) => voucher.used_count > 0).length;

  return {
    vouchers,
    stats: {
      total: vouchers.length,
      active,
      redeemed,
      expired,
      redemptionRate: vouchers.length ? (redeemedVouchers / vouchers.length) * 100 : null
    }
  };
}

export async function getVoucherDetails(voucherId: string): Promise<VoucherDetails | null> {
  const supabase = await createClient();
  const { data: voucher, error } = await supabase.from('vouchers').select('*').eq('id', voucherId).maybeSingle();
  if (error) {
    console.error('[vouchers] Could not load voucher details', { code: error.code, message: error.message });
    return null;
  }
  if (!voucher) return null;

  const rawRedemptions: Database['public']['Tables']['voucher_redemptions']['Row'][] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error: redemptionError } = await supabase.from('voucher_redemptions').select('*')
      .eq('voucher_id', voucherId).order('redeemed_at', { ascending: false }).range(offset, offset + 499);
    if (redemptionError) {
      console.error('[vouchers] Could not load voucher redemptions', {
        code: redemptionError.code,
        message: redemptionError.message
      });
      return { voucher, redemptions: [] as VoucherRedemption[] };
    }
    rawRedemptions.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }

  const customerIds = [...new Set(rawRedemptions.map((redemption) => redemption.customer_id))];
  const customerMap = new Map<string, VoucherRedemption['customer']>();
  for (let offset = 0; offset < customerIds.length; offset += 500) {
    const ids = customerIds.slice(offset, offset + 500);
    const { data: customers, error: customersError } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
    if (customersError) {
      console.error('[vouchers] Could not load redemption customer details', {
        code: customersError.code,
        message: customersError.message
      });
      continue;
    }
    for (const customer of customers ?? []) customerMap.set(customer.id, customer);
  }

  return {
    voucher,
    redemptions: rawRedemptions.map((redemption) => ({ ...redemption, customer: customerMap.get(redemption.customer_id) ?? null }))
  };
}

export async function getDraftCampaigns() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('email_campaigns').select('id, name, subject').eq('status', 'draft').order('created_at', { ascending: false });
  return error ? [] : data ?? [];
}
