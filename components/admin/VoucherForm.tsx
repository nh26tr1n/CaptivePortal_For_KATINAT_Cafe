'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { voucherCreateSchema } from '@/lib/validations';

export function VoucherForm() {
  const t = useTranslations('admin');
  const common = useTranslations('common');
  const router = useRouter();
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

  function generateCode() {
    setCode(`KAT-${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = {
      code,
      description: description.trim() || null,
      discount_type: discountType,
      discount_value: Number(discountValue),
      max_uses: maxUses ? Number(maxUses) : null,
      expires_at: expiresAt || null,
      active
    };
    const parsed = voucherCreateSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      toast.error(issue?.message === 'percent_over_100' ? t('voucherPercentLimit') : t('voucherInvalid'));
      return;
    }

    setBusy(true);
    try {
      const response = await fetch('/api/vouchers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data)
      });
      const result = await response.json() as { ok: boolean; voucher_id?: string; error?: string };
      if (!response.ok || !result.ok || !result.voucher_id) {
        if (result.error === 'duplicate_code') throw new Error('duplicate_code');
        throw new Error('voucher_save_failed');
      }
      toast.success(t('voucherCreated'));
      router.push(`/admin/vouchers/${result.voucher_id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error && error.message === 'duplicate_code' ? t('voucherDuplicateCode') : t('voucherSaveFailed'));
    } finally { setBusy(false); }
  }

  return (
    <form className="space-y-6" onSubmit={(event) => void submit(event)}>
      <Card>
        <CardHeader><CardTitle>{t('voucherDetails')}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="voucher-code">{t('voucherCode')}</Label>
            <div className="flex gap-2"><Input autoCapitalize="characters" id="voucher-code" maxLength={32} onChange={(event) => setCode(event.target.value.toUpperCase())} required value={code} /><Button onClick={generateCode} type="button" variant="outline">{t('generateCode')}</Button></div>
          </div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="voucher-description">{t('voucherDescription')}</Label><Textarea id="voucher-description" maxLength={500} onChange={(event) => setDescription(event.target.value)} value={description} /></div>
          <div className="space-y-2"><Label htmlFor="voucher-discount-type">{t('discountType')}</Label>
            <Select onValueChange={(value: 'percent' | 'fixed') => setDiscountType(value)} value={discountType}>
              <SelectTrigger id="voucher-discount-type"><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="percent">{t('discountPercent')}</SelectItem><SelectItem value="fixed">{t('discountFixed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="voucher-discount-value">{t('discountValue')}</Label><Input id="voucher-discount-value" min="0.01" max={discountType === 'percent' ? 100 : undefined} onChange={(event) => setDiscountValue(event.target.value)} required step="0.01" type="number" value={discountValue} /></div>
          <div className="space-y-2"><Label htmlFor="voucher-max-uses">{t('maxUses')}</Label><Input id="voucher-max-uses" min="1" onChange={(event) => setMaxUses(event.target.value)} placeholder={t('unlimitedUses')} step="1" type="number" value={maxUses} /></div>
          <div className="space-y-2"><Label htmlFor="voucher-expires-at">{t('expiresAt')}</Label><Input id="voucher-expires-at" onChange={(event) => setExpiresAt(event.target.value)} type="date" value={expiresAt} /></div>
          <label className="flex items-center gap-2 sm:col-span-2"><input checked={active} onChange={(event) => setActive(event.target.checked)} type="checkbox" />{t('voucherActive')}</label>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-3"><Button asChild type="button" variant="outline"><Link href="/admin/vouchers">{common('cancel')}</Link></Button><Button disabled={busy} type="submit">{t('createVoucher')}</Button></div>
    </form>
  );
}
