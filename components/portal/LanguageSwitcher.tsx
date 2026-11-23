'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@/lib/i18n/config';

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations('common');
  const router = useRouter();

  function changeLanguage(nextLocale: Locale) {
    document.cookie = `NEXT_LOCALE=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>{t('language')}</span>
      <select
        aria-label={t('language')}
        className="rounded-md border bg-background px-2 py-1 text-foreground"
        onChange={(event) => changeLanguage(event.target.value as Locale)}
        value={locale}
      >
        <option value="vi">{t('languageVi')}</option>
        <option value="en">{t('languageEn')}</option>
      </select>
    </label>
  );
}
