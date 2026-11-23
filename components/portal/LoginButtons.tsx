'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Facebook, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { EmailLoginForm } from '@/components/portal/EmailLoginForm';
import { createClient } from '@/lib/supabase/client';

type OAuthProvider = 'google' | 'facebook';

type LoginButtonsProps = {
  isAuthenticated: boolean;
  authStatus?: string;
};

function getAppUrl() {
  const currentOrigin = window.location.origin.replace(/\/+$/, '');
  const currentHostname = window.location.hostname;
  const isLocalDevelopment = currentHostname === 'localhost' || currentHostname === '127.0.0.1';

  // Follow the actual local port so OAuth does not return to a stale NEXT_PUBLIC_APP_URL port.
  if (isLocalDevelopment) return currentOrigin;

  return (process.env.NEXT_PUBLIC_APP_URL || currentOrigin).replace(/\/+$/, '');
}

export function LoginButtons({ isAuthenticated, authStatus }: LoginButtonsProps) {
  const t = useTranslations('portal');
  const common = useTranslations('common');
  const router = useRouter();
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [loadingMethod, setLoadingMethod] = useState<OAuthProvider | null>(null);

  useEffect(() => {
    if (authStatus === 'success') {
      toast.success(t('authSuccess'));
      router.replace('/portal', { scroll: false });
    } else if (authStatus === 'error') {
      toast.error(t('authFailed'));
      router.replace('/portal', { scroll: false });
    }
  }, [authStatus, router, t]);

  async function handleOAuth(provider: OAuthProvider) {
    setLoadingMethod(provider);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${getAppUrl()}/api/auth/callback`,
          ...(provider === 'facebook' ? { scopes: 'email' } : {})
        }
      });

      if (error) {
        toast.error(t('loginError'));
        setLoadingMethod(null);
      }
    } catch {
      toast.error(t('loginError'));
      setLoadingMethod(null);
    }
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="w-full space-y-3">
      <Button
        className="h-12 w-full justify-center rounded-xl border-stone-200 bg-white text-sm font-medium text-stone-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-950 hover:shadow-md"
        disabled={loadingMethod !== null}
        onClick={() => void handleOAuth('google')}
        type="button"
        variant="outline"
      >
        <GoogleMark />
        {loadingMethod === 'google' ? common('loading') : t('loginWithGoogle')}
      </Button>
      <Button
        className="h-12 w-full justify-center rounded-xl border-stone-200 bg-white text-sm font-medium text-stone-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-950 hover:shadow-md"
        disabled={loadingMethod !== null}
        onClick={() => void handleOAuth('facebook')}
        type="button"
        variant="outline"
      >
        <Facebook aria-hidden="true" className="mr-2 h-[18px] w-[18px] fill-[#1877F2] text-[#1877F2]" />
        {loadingMethod === 'facebook' ? common('loading') : t('loginWithFacebook')}
      </Button>
      <Button
        className="h-12 w-full justify-center rounded-xl border-stone-200 bg-white text-sm font-medium text-stone-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-950 hover:shadow-md"
        disabled={loadingMethod !== null}
        onClick={() => setIsEmailDialogOpen(true)}
        type="button"
        variant="outline"
      >
        <Mail aria-hidden="true" className="mr-2 h-[18px] w-[18px] text-[#805c3b]" />
        {t('loginWithEmail')}
      </Button>

      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="border-stone-200 bg-white text-stone-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle>{t('emailDialogTitle')}</DialogTitle>
            <DialogDescription>{t('emailDialogDescription')}</DialogDescription>
          </DialogHeader>
          <EmailLoginForm
            onAuthenticated={() => {
              setIsEmailDialogOpen(false);
              window.location.assign('/portal?auth=success&source=email');
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="mr-2 h-[18px] w-[18px]" viewBox="0 0 48 48">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.8 6-15Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.7-5.1c-1.9 1.3-4.2 2-6.8 2-5.2 0-9.6-3.5-11.2-8.2H5.9v5.2A20 20 0 0 0 24 44Z" />
      <path fill="#FBBC05" d="M12.8 27.9a12 12 0 0 1 0-7.8v-5.2H5.9a20 20 0 0 0 0 18.2l6.9-5.2Z" />
      <path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.8 3.1l5.9-5.9A19.7 19.7 0 0 0 24 4 20 20 0 0 0 5.9 14.9l6.9 5.2c1.6-4.7 6-8.2 11.2-8.2Z" />
    </svg>
  );
}
