import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export async function middleware(request: NextRequest) {
  console.info('[middleware] admin request received', { path: request.nextUrl.pathname });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[middleware] Supabase environment variables are missing');
    return NextResponse.json({ error: 'Admin authentication is temporarily unavailable.' }, { status: 503 });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  }) as unknown as SupabaseClient<Database, 'public'>;

  let user;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      if (error.name === 'AuthSessionMissingError') {
        console.info('[middleware] no authenticated user; redirecting to /portal', {
          path: request.nextUrl.pathname
        });
        return NextResponse.redirect(new URL('/portal', request.url));
      }
      console.error('[middleware] failed to verify session', { code: error.code, message: error.message });
      return NextResponse.json({ error: 'Could not verify your session. Please retry.' }, { status: 503 });
    }
    user = data.user;
  } catch (error) {
    console.error('[middleware] unexpected session verification failure', error);
    return NextResponse.json({ error: 'Could not verify your session. Please retry.' }, { status: 503 });
  }

  if (!user) {
    console.info('[middleware] no authenticated user; redirecting to /portal', {
      path: request.nextUrl.pathname
    });
    return NextResponse.redirect(new URL('/portal', request.url));
  }

  let profile;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[middleware] failed to load user profile', { code: error.code, message: error.message });
      return NextResponse.json({ error: 'Could not verify admin permissions. Please retry.' }, { status: 503 });
    }
    profile = data;
  } catch (error) {
    console.error('[middleware] unexpected profile lookup failure', error);
    return NextResponse.json({ error: 'Could not verify admin permissions. Please retry.' }, { status: 503 });
  }

  if (profile?.role !== 'admin') {
    console.info('[middleware] non-admin user; redirecting to /portal', {
      path: request.nextUrl.pathname,
      userId: user.id,
      role: profile?.role ?? null
    });
    return NextResponse.redirect(new URL('/portal', request.url));
  }

  console.info('[middleware] admin access granted', {
    path: request.nextUrl.pathname,
    userId: user.id
  });
  return response;
}

export const config = {
  matcher: ['/admin/:path*']
};
