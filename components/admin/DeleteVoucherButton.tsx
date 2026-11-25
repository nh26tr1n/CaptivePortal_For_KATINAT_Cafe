'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

export function DeleteVoucherButton({ voucherId, voucherCode }: { voucherId: string; voucherCode: string }) {
  const t = useTranslations('admin');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function removeVoucher() {
    setBusy(true);
    try {
      const response = await fetch(`/api/vouchers/${voucherId}`, { method: 'DELETE' });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error ?? 'delete_failed');
      toast.success(t('voucherDeleteSuccess'));
      router.push('/admin/vouchers');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error && error.message === 'voucher_has_redemptions'
        ? t('voucherDeleteHasRedemptions')
        : t('voucherDeleteFailed'));
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} type="button" variant="destructive">
        <Trash2 aria-hidden="true" />{t('voucherDeleteButton')}
      </Button>
      <ConfirmDialog
        busy={busy}
        confirmLabel={t('voucherDeleteButton')}
        description={t('voucherDeleteConfirmDescription', { code: voucherCode })}
        onCancel={() => setOpen(false)}
        onConfirm={() => void removeVoucher()}
        open={open}
        title={t('voucherDeleteConfirmTitle')}
      />
    </>
  );
}
