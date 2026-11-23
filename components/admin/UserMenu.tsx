'use client';

import { useRouter } from 'next/navigation';
import { LogOut, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';

export function UserMenu({ email }: { email: string }) {
  const t = useTranslations('common');
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(t('logoutError'));
      return;
    }
    router.replace('/portal');
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label={email} className="max-w-56 justify-start gap-2 border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700" variant="outline">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-100 text-indigo-700"><UserRound aria-hidden="true" className="h-4 w-4" /></span>
          <span className="truncate">{email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handleLogout()}>
          <LogOut aria-hidden="true" />
          <span>{t('logout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
