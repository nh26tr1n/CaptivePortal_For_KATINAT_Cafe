import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { UserMenu } from '@/components/admin/UserMenu';
import { LanguageSwitcher } from '@/components/portal/LanguageSwitcher';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { createClient } from '@/lib/supabase/server';

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const t = await getTranslations('common');
  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    console.error('[admin/layout] could not create Supabase client', error);
    return <AdminError message={t('adminLoadError')} />;
  }

  let user;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('[admin/layout] could not verify session', { code: error.code, message: error.message });
      return <AdminError message={t('adminSessionError')} />;
    }
    user = data.user;
  } catch (error) {
    console.error('[admin/layout] unexpected session verification failure', error);
    return <AdminError message={t('adminSessionError')} />;
  }

  if (!user) redirect('/portal');

  let profile;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (error) {
      console.error('[admin/layout] could not load user role', { code: error.code, message: error.message });
      return <AdminError message={t('adminPermissionError')} />;
    }
    profile = data;
  } catch (error) {
    console.error('[admin/layout] unexpected profile lookup failure', error);
    return <AdminError message={t('adminPermissionError')} />;
  }

  if (profile?.role !== 'admin') redirect('/portal');

  const email = user.email ?? t('adminUser');

  return (
    <div className="admin-shell">
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-20 flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 text-slate-900 backdrop-blur sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="border border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{t('cafeName')}</p>
                <p className="truncate text-xs text-slate-500">{t('addressShort')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <UserMenu email={email} />
            </div>
          </header>
          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

async function AdminError({ message }: { message: string }) {
  const t = await getTranslations('common');

  return (
    <main className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="max-w-lg space-y-2 rounded-lg border bg-card p-6 text-center">
        <h1 className="text-lg font-semibold">{message}</h1>
        <p className="text-sm text-muted-foreground">{t('adminDashboardError')}</p>
      </div>
    </main>
  );
}
