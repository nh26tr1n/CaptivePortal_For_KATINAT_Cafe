'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

type SessionState =
  | { status: 'loading' }
  | { status: 'error'; reason: string }
  | { status: 'ready'; sessionId: string; startedAt: string };

type ConnectionSuccessProps = {
  ssid: string;
  sessionState: SessionState;
  onRetry: () => void;
  onContinue: () => void;
};

export function ConnectionSuccess({ ssid, sessionState, onRetry, onContinue }: ConnectionSuccessProps) {
  const t = useTranslations('portal');
  const locale = useLocale();
  const startedAt = sessionState.status === 'ready'
    ? new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Ho_Chi_Minh'
      }).format(new Date(sessionState.startedAt))
    : null;
  const sessionError = sessionState.status === 'error'
    ? sessionState.reason === 'admin_config_missing'
      ? t('sessionAdminConfigError')
      : sessionState.reason === 'hotspot_not_configured'
        ? t('sessionHotspotMissingError')
        : sessionState.reason === 'session_schema_not_ready'
          ? t('sessionSchemaError')
          : t('sessionStartError')
    : null;

  return (
    <Dialog open>
      <DialogContent className="border-stone-200 bg-white text-stone-900 shadow-2xl" showCloseButton={false}>
        <DialogHeader className="items-center text-center">
          <div aria-hidden="true" className="mb-2 grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <Check className="h-7 w-7" strokeWidth={3} />
          </div>
          <DialogTitle className="text-xl">{t('connectionCongrats')}</DialogTitle>
          <DialogDescription>{t('wifiName')}: <span className="font-medium text-stone-900">{ssid}</span></DialogDescription>
        </DialogHeader>
        {sessionState.status === 'loading' ? (
          <p aria-live="polite" className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-center text-sm text-stone-600">{t('sessionStarting')}</p>
        ) : null}
        {sessionState.status === 'error' ? (
          <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 text-center">
            <p className="text-sm text-red-800">{sessionError}</p>
            <Button onClick={onRetry} type="button" variant="outline">{t('retrySession')}</Button>
          </div>
        ) : null}
        {sessionState.status === 'ready' && startedAt ? (
          <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-center text-xs text-stone-600">{t('sessionStartedAt', { time: startedAt })}</p>
        ) : null}
        <Button className="w-full" disabled={sessionState.status === 'loading'} onClick={onContinue} type="button">
          {t('continue')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
