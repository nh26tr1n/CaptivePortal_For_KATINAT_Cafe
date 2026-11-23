import { ArrowUpRight, MapPin, Wifi } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Carousel } from '@/components/portal/Carousel';
import { LanguageSwitcher } from '@/components/portal/LanguageSwitcher';
import { PortalFlow } from '@/components/portal/PortalFlow';
import { getUser } from '@/lib/auth/getUser';
import { createClient } from '@/lib/supabase/server';
import type { ConsentSource } from '@/components/portal/ConsentDialog';

type PortalPageProps = {
  searchParams?: { auth?: string; source?: string; reason?: string };
};

function getConsentSource(source: string | undefined, provider: string | undefined): ConsentSource {
  const value = source ?? provider;
  return value === 'google' || value === 'facebook' ? value : 'email';
}

export default async function PortalPage({ searchParams }: PortalPageProps) {
  const [common, portal, currentUser] = await Promise.all([
    getTranslations('common'),
    getTranslations('portal'),
    getUser()
  ]);
  let hasRecordedConsent = false;

  if (currentUser.user) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('marketing_consents')
        .select('id')
        .eq('customer_id', currentUser.user.id)
        .limit(1)
        .maybeSingle();
      hasRecordedConsent = Boolean(data);
    } catch {
      hasRecordedConsent = false;
    }
  }

  const source = getConsentSource(searchParams?.source, String(currentUser.user?.app_metadata.provider ?? ''));

  return (
    <main className="min-h-dvh bg-[#f5f1e9] text-[#352923] lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(370px,2fr)]">
      <div className="h-[48svh] min-h-[340px] overflow-hidden lg:sticky lg:top-0 lg:h-dvh lg:min-h-[680px]">
        <Carousel />
      </div>

      <section className="flex min-h-[52svh] flex-col bg-[#f8f6f0] px-6 pb-7 pt-4 sm:px-10 lg:min-h-dvh lg:px-12 lg:py-8 xl:px-16">
        <header className="flex items-center justify-between gap-4">
          <div aria-label={common('cafeName')} className="leading-none">
            <p className="font-serif text-[1.65rem] font-semibold tracking-[0.2em] text-[#56372b] sm:text-3xl">
              {common('logoName')}
            </p>
            <p className="mt-2 text-[0.57rem] font-medium tracking-[0.48em] text-[#8e7157]">
              {common('logoSubtitle')}
            </p>
          </div>
          <LanguageSwitcher />
        </header>

        <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col justify-center py-9 sm:py-12 lg:py-10">
          <div className="mb-7">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#9a7955]">
              {portal('guestNetwork')}
            </p>
            <h1 className="font-serif text-3xl font-medium leading-tight tracking-[0.015em] text-[#382820] sm:text-4xl">
              {common('cafeName')}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#76695f]">{portal('connectWifi')}</p>
          </div>

          <div className="mb-7 rounded-2xl border border-dashed border-[#b79b72]/70 bg-[#fcfaf5] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eee4d3] text-[#71563d]">
                <MapPin aria-hidden="true" className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#9a7955]">
                  {portal('cafeLocation')}
                </p>
                <p className="mt-1.5 text-xs leading-5 text-[#63574e] sm:text-sm">{common('address')}</p>
              </div>
            </div>
            <div className="my-4 border-t border-dashed border-[#d8c9b2]" />
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eee4d3] text-[#71563d]">
                <Wifi aria-hidden="true" className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#9a7955]">
                  {portal('wifiName')}
                </p>
                <p className="mt-1 font-medium tracking-[0.08em] text-[#49362b]">{portal('ssid')}</p>
              </div>
            </div>
          </div>

          {currentUser.user ? (
            <p className="mb-5 break-all text-center text-xs text-[#76695f]">
              {currentUser.user.email
                ? portal('signedInAs', { email: currentUser.user.email })
                : portal('signedInWithoutEmail')}
            </p>
          ) : null}

          <PortalFlow
            authStatus={searchParams?.auth}
            authReason={searchParams?.reason}
            hasRecordedConsent={hasRecordedConsent}
            isAuthenticated={Boolean(currentUser.user)}
            source={source}
            ssid={portal('ssid')}
          />
        </div>

        {!currentUser.user ? (
          <footer className="mx-auto flex w-full max-w-[430px] items-center justify-between gap-4 border-t border-[#e8e1d5] pt-5">
            <p className="text-[10px] tracking-wide text-[#96887b]">{common('cafeName')}</p>
            <a
              className="inline-flex items-center gap-1 text-xs font-medium text-[#765b3e] underline-offset-4 transition hover:text-[#4d3426] hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b99b70]"
              href="https://katinat.vn/"
              rel="noopener noreferrer"
              target="_blank"
            >
              {portal('homeLink')}
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            </a>
          </footer>
        ) : null}
      </section>
    </main>
  );
}
