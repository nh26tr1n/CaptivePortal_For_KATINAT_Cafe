import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, locales, type Locale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const cookieLocale = cookies().get('NEXT_LOCALE')?.value;
  const candidateLocale = cookieLocale ?? requestedLocale;
  const locale: Locale = locales.includes(candidateLocale as Locale)
    ? (candidateLocale as Locale)
    : defaultLocale;

  return {
    locale,
    messages: (await import(`../../locales/${locale}.json`)).default
  };
});
