'use client';

import { AlertTriangle, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Hủy',
  busy = false,
  onCancel,
  onConfirm
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !busy && onCancel()}>
      <DialogContent className="border-slate-200">
        <DialogHeader>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-700 sm:mx-0">
            <AlertTriangle aria-hidden="true" className="h-6 w-6" />
          </div>
          <DialogTitle className="text-slate-900">{title}</DialogTitle>
          <DialogDescription className="text-slate-600">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 gap-2 sm:gap-2">
          <Button disabled={busy} onClick={onCancel} type="button" variant="outline">{cancelLabel}</Button>
          <Button disabled={busy} onClick={onConfirm} type="button" variant="destructive">
            {busy ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
