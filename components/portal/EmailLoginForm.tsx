'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

type EmailLoginFormProps = {
  onAuthenticated: () => void;
};

export function EmailLoginForm({ onAuthenticated }: EmailLoginFormProps) {
  const t = useTranslations('portal');
  const common = useTranslations('common');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [errorKey, setErrorKey] = useState<'loginError' | 'otpInvalid' | 'otpRateLimited' | 'otpSendFailed' | null>(null);
  const [sendErrorCode, setSendErrorCode] = useState<string | null>(null);
  const [sendErrorDetail, setSendErrorDetail] = useState<string | null>(null);

  useEffect(() => {
    if (resendCountdown === 0) return;

    const timer = window.setInterval(() => {
      setResendCountdown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCountdown]);

  async function sendOtp(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    setIsBusy(true);
    setErrorKey(null);
    setSendErrorCode(null);
    setSendErrorDetail(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        // This flow verifies the six-digit code directly; a redirect URL is only needed for link-based sign-in.
        email: normalizedEmail
      });

      if (error) {
        console.error('[EmailLoginForm] Supabase OTP send failed:', {
          status: error.status,
          code: error.code,
          message: error.message
        });
        const errorMessage = error.message.toLowerCase();
        const key = error.status === 429 || errorMessage.includes('rate limit') || errorMessage.includes('too many')
          ? 'otpRateLimited'
          : 'otpSendFailed';
        setErrorKey(key);
        setSendErrorCode(error.code || (error.status ? `http_${error.status}` : 'unknown'));
        setSendErrorDetail(error.message.slice(0, 240));
        toast.error(t(key));
        return;
      }

      setEmail(normalizedEmail);
      setStep('otp');
      setOtp('');
      setResendCountdown(60);
      toast.success(t('otpSentMessage'));
    } catch (error) {
      console.error('[EmailLoginForm] Unexpected OTP send failure:', error);
      setErrorKey('otpSendFailed');
      setSendErrorCode('network_error');
      setSendErrorDetail(error instanceof Error ? error.message.slice(0, 240) : null);
      toast.error(t('otpSendFailed'));
    } finally {
      setIsBusy(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) return;

    setIsBusy(true);
    setErrorKey(null);
    setSendErrorCode(null);
    setSendErrorDetail(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      });

      if (error) {
        setErrorKey('otpInvalid');
        toast.error(t('otpInvalid'));
        return;
      }

      toast.success(t('authSuccess'));
      onAuthenticated();
    } catch (error) {
      console.error('[EmailLoginForm] Unexpected OTP verification failure:', error);
      setErrorKey('otpInvalid');
      toast.error(t('otpInvalid'));
    } finally {
      setIsBusy(false);
    }
  }

  return step === 'email' ? (
    <form className="space-y-4" onSubmit={(event) => void sendOtp(event)}>
      <div className="space-y-2">
        <Label htmlFor="login-email">{t('email')}</Label>
        <Input
          autoComplete="email"
          id="login-email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t('emailPlaceholder')}
          required
          type="email"
          value={email}
        />
      </div>
      {errorKey ? (
        <div aria-live="assertive" className="space-y-1 text-sm text-red-700" role="alert">
          <p>{t(errorKey)}</p>
          {sendErrorCode ? <p className="text-xs text-red-600">{t('otpErrorCode', { code: sendErrorCode })}</p> : null}
          {sendErrorDetail ? <p className="break-words text-xs text-red-600">{t('otpErrorDetails', { details: sendErrorDetail })}</p> : null}
        </div>
      ) : null}
      <Button className="w-full" disabled={isBusy || !email.trim()} type="submit">
        {isBusy ? common('loading') : t('sendOtp')}
      </Button>
    </form>
  ) : (
    <form className="space-y-4" onSubmit={(event) => void verifyOtp(event)}>
      <p aria-live="polite" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">
        {t('otpSentMessage')}
        <span className="mt-1 block break-all font-medium">{email}</span>
      </p>
      <div className="space-y-2">
        <Label htmlFor="login-otp">{t('otpCode')}</Label>
        <Input
          autoComplete="one-time-code"
          autoFocus
          id="login-otp"
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
          pattern="[0-9]{6}"
          placeholder="••••••"
          required
          type="text"
          value={otp}
        />
      </div>
      {errorKey ? <p aria-live="assertive" className="text-sm text-red-700" role="alert">{t(errorKey)}</p> : null}
      <Button className="w-full" disabled={isBusy || otp.length !== 6} type="submit">
        {isBusy ? common('loading') : t('verifyOtp')}
      </Button>
      <div className="text-center text-sm">
        {resendCountdown > 0 ? (
          <p className="text-stone-500">{t('resendOtpCountdown', { seconds: resendCountdown })}</p>
        ) : (
          <Button
            className="h-auto p-0 text-[#765b3e] underline underline-offset-4"
            disabled={isBusy}
            onClick={() => void sendOtp()}
            type="button"
            variant="link"
          >
            {t('resendOtp')}
          </Button>
        )}
      </div>
      <Button
        className="w-full"
        disabled={isBusy}
        onClick={() => {
          setStep('email');
          setOtp('');
          setErrorKey(null);
        }}
        type="button"
        variant="ghost"
      >
        {t('changeEmail')}
      </Button>
    </form>
  );
}
