import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/database';

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/portal', request.url));
  const code = request.nextUrl.searchParams.get('code');
  const authError = request.nextUrl.searchParams.get('error');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const redirectWithError = (reason: string) => {
    console.warn('[auth/callback] redirecting after failure', {
      reason,
      origin: request.nextUrl.origin,
      hasAuthorizationCode: Boolean(code),
      providerErrorCode: authError,
      status: response.status
    });
    const destination = new URL('/portal', request.url);
    destination.searchParams.set('auth', 'error');
    destination.searchParams.set('reason', reason);
    response.headers.set('Location', destination.toString());
    return response;
  };

  console.info('[auth/callback] request received', {
    origin: request.nextUrl.origin,
    hasAuthorizationCode: Boolean(code),
    providerErrorCode: authError,
    supabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey)
  });

  if (authError) return redirectWithError('provider_error');
  if (!code) return redirectWithError('missing_code');
  if (!supabaseUrl || !supabaseAnonKey) return redirectWithError('configuration_missing');

  try {
    const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        }
      }
    }) as unknown as SupabaseClient<Database, 'public'>;

    const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError || !exchangeData.session) {
      console.error('[auth/callback] code exchange failed', {
        status: exchangeError?.status,
        code: exchangeError?.code,
        message: exchangeError?.message,
        sessionCreated: Boolean(exchangeData.session)
      });
      return redirectWithError('session_exchange_failed');
    }
    console.info('[auth/callback] code exchange succeeded', { sessionCreated: true });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[auth/callback] user lookup failed', {
        status: userError?.status,
        code: userError?.code,
        message: userError?.message,
        userFound: Boolean(user)
      });
      return redirectWithError('user_lookup_failed');
    }

    const authProvider = user.app_metadata.provider;
    const provider = authProvider === 'google' || authProvider === 'facebook' || authProvider === 'email'
      ? authProvider
      : 'email';
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError) {
      console.error('[auth/callback] profile lookup failed', {
        code: profileError.code,
        message: profileError.message
      });
      return redirectWithError('profile_lookup_failed');
    }

    const isAdmin = profile?.role === 'admin';
    const destination = isAdmin
      ? '/admin'
      : `/portal?auth=success&source=${encodeURIComponent(provider)}`;

    console.info('[auth/callback] authentication succeeded', {
      userId: user.id,
      hasEmail: Boolean(user.email),
      provider,
      isAdmin,
      redirectStatus: response.status
    });
    response.headers.set('Location', new URL(destination, request.url).toString());
    return response;
  } catch (error) {
    console.error('[auth/callback] unexpected error', error);
    return redirectWithError('unexpected_callback_error');
  }
}
