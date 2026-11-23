'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Mail,
  LayoutDashboard,
  Smartphone,
  TicketPercent,
  Users,
  Wifi
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar';

const items = [
  { key: 'overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { key: 'customers', href: '/admin/customers', icon: Users },
  { key: 'devices', href: '/admin/devices', icon: Smartphone },
  { key: 'sessions', href: '/admin/sessions', icon: Wifi },
  { key: 'analytics', href: '/admin/analytics', icon: BarChart3 },
  { key: 'vouchers', href: '/admin/vouchers', icon: TicketPercent },
  { key: 'sendEmail', href: '/admin/send-email', icon: Mail }
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const t = useTranslations('admin');

  return (
    <Sidebar className="border-r border-slate-700 bg-slate-800 text-slate-100" collapsible="offcanvas">
      <SidebarHeader className="border-b border-slate-700 px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-950/30">KA</div>
          <div>
            <p className="text-sm font-bold tracking-wide text-white">KATINAT</p>
            <p className="mt-0.5 text-xs text-slate-400">{t('adminPanel')}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{t('navigation')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(({ key, href, icon: Icon }) => (
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton
                    asChild
                    className="h-11 rounded-lg px-3 text-slate-300 hover:bg-slate-700 hover:text-white data-[active=true]:bg-indigo-600 data-[active=true]:text-white data-[active=true]:shadow-lg data-[active=true]:shadow-indigo-950/20"
                    isActive={pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(`${href}/`))}
                    size="lg"
                  >
                    <Link href={href}>
                      <Icon aria-hidden="true" className="h-5 w-5" />
                      <span className="font-medium">{t(key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
