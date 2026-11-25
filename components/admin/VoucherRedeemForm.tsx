'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function VoucherRedeemForm() {
  const t = useTranslations('admin');
  const common = useTranslations('common');
  const router = useRouter();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<{ email: string; usedCount: number | null } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setSuccess(null);
    try {
      const response = await fetch('/api/vouchers/redeem', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, customer_email: email })
      });
      const result = await response.json() as { ok: boolean; error?: string; used_count?: number | null; customer_email?: string };
      if (!response.ok || !result.ok) throw new Error(result.error ?? 'redemption_failed');
      setSuccess({ email: result.customer_email ?? email, usedCount: result.used_count ?? null });
      setCode('');
      setEmail('');
      toast.success(t('voucherRedeemed'));
      router.refresh();
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'redemption_failed';
      const message = reason === 'already_redeemed' ? t('voucherAlreadyRedeemed')
        : reason === 'not_found' ? t('voucherNotFound')
        : reason === 'inactive' ? t('voucherInactive')
        : reason === 'expired' ? t('voucherExpired')
        : reason === 'exhausted' ? t('voucherExhausted')
        : reason === 'customer_not_found' ? t('voucherCustomerNotFound')
        : t('voucherRedeemFailed');
      toast.error(message);
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Card>
        <CardHeader><CardTitle>{t('voucherRedeemTitle')}</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void submit(event)}>
            <div className="space-y-2"><Label htmlFor="redeem-code">{t('voucherCode')}</Label><Input autoCapitalize="characters" id="redeem-code" onChange={(event) => setCode(event.target.value.toUpperCase())} required value={code} /></div>
            <div className="space-y-2"><Label htmlFor="redeem-email">{t('customerEmail')}</Label><Input autoComplete="email" id="redeem-email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></div>
            <Button className="w-full" disabled={busy} type="submit">{t('redeemVoucher')}</Button>
          </form>
        </CardContent>
      </Card>
      {success ? <Card><CardContent className="space-y-1 p-4 text-sm"><p className="font-medium">{t('voucherRedeemSuccess', { email: success.email })}</p><p className="text-muted-foreground">{success.usedCount === null ? common('noData') : t('voucherUsedCount', { count: success.usedCount })}</p></CardContent></Card> : null}
    </div>
  );
}
