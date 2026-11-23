'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { LoginButtons } from '@/components/portal/LoginButtons';
import { ConsentDialog, type ConsentSource } from '@/components/portal/ConsentDialog';
import { ConnectionSuccess } from '@/components/portal/ConnectionSuccess';
import { detectDeviceType, generateFingerprint } from '@/lib/network/deviceFingerprint';
import { useHeartbeat } from '@/hooks/useHeartbeat';
import { useSessionEnd } from '@/hooks/useSessionEnd';
type FlowStep = 'login' | 'connected' | 'consent' | 'saved';
type SessionState =
  | { status: 'loading' }
  | { status: 'error'; reason: string }
  | { status: 'ready'; sessionId: string; startedAt: string };

type PortalFlowProps = {
  isAuthenticated: boolean;
  hasRecordedConsent: boolean;
  source: ConsentSource;
  authStatus?: string;
  authReason?: string;
  ssid: string;
};

export function PortalFlow({
  isAuthenticated,
  hasRecordedConsent,
  source,
  authStatus,
  authReason,
  ssid
}: PortalFlowProps) {
  const t = useTranslations('portal');
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>({ status: 'loading' });
  const [sessionRetry, setSessionRetry] = useState(0);
  const [step, setStep] = useState<FlowStep>(isAuthenticated ? 'connected' : 'login');

  useEffect(() => {
    if (authStatus === 'success') {
      toast.success(t('authSuccess'));
      router.replace('/portal', { scroll: false });
    } else if (authStatus === 'error') {
      const errorKey = authReason === 'provider_error'
        ? 'authProviderError'
        : authReason === 'configuration_missing'
          ? 'authConfigurationError'
          : 'authCallbackError';
      toast.error(t(errorKey));
      router.replace('/portal', { scroll: false });
    }
  }, [authReason, authStatus, router, t]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let isCurrent = true;
    setSessionState({ status: 'loading' });

    async function createSession() {
      try {
        const deviceFingerprint = await generateFingerprint();
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            login_method: source,
            device_fingerprint: deviceFingerprint,
            device_type: detectDeviceType(window.navigator.userAgent)
          })
        });
        const result = await response.json() as {
          session_id?: string;
          started_at?: string;
          error?: string;
        };

        if (!response.ok || !result.session_id || !result.started_at) {
          if (result.error) {
            throw new Error(result.error);
          }
          throw new Error('session_create_failed');
        }
        if (isCurrent) {
          setSessionState({
            status: 'ready',
            sessionId: result.session_id,
            startedAt: result.started_at
          });
        }
      } catch (error) {
        if (isCurrent) {
          setSessionState({
            status: 'error',
            reason: error instanceof Error ? error.message : 'session_create_failed'
          });
        }
      }
    }

    void createSession();
    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated, sessionRetry, source]);

  useEffect(() => {
    if (step !== 'saved') return;

    const redirectTimer = window.setTimeout(() => {
      window.location.href = 'https://katinat.vn/';
    }, 900);

    return () => window.clearTimeout(redirectTimer);
  }, [step]);

  const activeSessionId = sessionState.status === 'ready' ? sessionState.sessionId : null;
  useHeartbeat(activeSessionId);
  useSessionEnd(activeSessionId);

  if (step === 'login') {
    return (
      <>
        <h2 className="mb-4 text-center text-lg font-medium">{t('loginTitle')}</h2>
        <LoginButtons isAuthenticated={false} />
      </>
    );
  }

  if (step === 'connected') {
    return (
      <ConnectionSuccess
        onContinue={() => {
          if (hasRecordedConsent) {
            window.location.href = 'https://katinat.vn/';
            return;
          }
          setStep('consent');
        }}
        onRetry={() => setSessionRetry((value) => value + 1)}
        sessionState={sessionState}
        ssid={ssid}
      />
    );
  }

  if (step === 'consent') {
    return (
      <ConsentDialog
        onComplete={() => {
          toast.success(t('consentSaved'));
          setStep('saved');
        }}
        source={source}
      />
    );
  }

  return (
    <div aria-live="polite" className="fixed inset-0 z-[60] grid place-items-center bg-[#f5f1e9] p-6 text-center text-[#352923]">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-[#e5dccd] bg-white p-8 shadow-xl">
        <div aria-hidden="true" className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="h-7 w-7" strokeWidth={3} />
        </div>
        <h2 className="font-serif text-2xl font-semibold">{t('consentSaved')}</h2>
        <p className="text-sm text-stone-600">{t('redirectingHome')}</p>
      </div>
    </div>
  );
}
