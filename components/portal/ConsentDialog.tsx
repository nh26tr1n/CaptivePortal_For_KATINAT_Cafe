'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

export type ConsentSource = 'google' | 'facebook' | 'email';

type ConsentDialogProps = {
  source: ConsentSource;
  onComplete: () => void;
};

export function ConsentDialog({ source, onComplete }: ConsentDialogProps) {
  const t = useTranslations('portal');
  const common = useTranslations('common');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<'generic' | 'configuration' | null>(null);

  async function submitConsent(consented: boolean) {
    setIsSaving(true);
    setSaveError(null);
    try {
      const response = await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consented, source })
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) {
        const reason = result.error === 'admin_config_missing' ? 'configuration' : 'generic';
        setSaveError(reason);
        toast.error(reason === 'configuration' ? t('consentAdminConfigError') : t('consentSaveError'));
        return;
      }

      onComplete();
    } catch {
      setSaveError('generic');
      toast.error(t('consentSaveError'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open>
      <DialogContent className="bg-white text-stone-900" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('marketingConsentTitle')}</DialogTitle>
          <DialogDescription>{t('marketingConsentQuestion')}</DialogDescription>
        </DialogHeader>
        {saveError ? (
          <p aria-live="assertive" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {saveError === 'configuration' ? t('consentAdminConfigError') : t('consentSaveError')}
          </p>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button disabled={isSaving} onClick={() => void submitConsent(true)} type="button">
            {isSaving ? common('loading') : t('marketingConsentYes')}
          </Button>
          <Button disabled={isSaving} onClick={() => void submitConsent(false)} type="button" variant="outline">
            {isSaving ? common('loading') : t('marketingConsentNo')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
