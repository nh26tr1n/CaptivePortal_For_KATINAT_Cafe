'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

export function DeleteVoucherButton({ voucherId, voucherCode }: { voucherId: string; voucherCode: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function removeVoucher() {
    setBusy(true);
    try {
      const response = await fetch(`/api/vouchers/${voucherId}`, { method: 'DELETE' });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error ?? 'delete_failed');
      toast.success('Đã xóa voucher.');
      router.push('/admin/vouchers');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error && error.message === 'voucher_has_redemptions'
        ? 'Không thể xóa voucher đã có lượt đổi.'
        : 'Không thể xóa voucher.');
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} type="button" variant="destructive">
        <Trash2 aria-hidden="true" />Xóa voucher
      </Button>
      <ConfirmDialog
        busy={busy}
        cancelLabel="Hủy"
        confirmLabel="Xóa voucher"
        description={`Bạn có chắc muốn xóa voucher ${voucherCode}? Hành động này không thể hoàn tác.`}
        onCancel={() => setOpen(false)}
        onConfirm={() => void removeVoucher()}
        open={open}
        title="Xác nhận xóa voucher"
      />
    </>
  );
}
