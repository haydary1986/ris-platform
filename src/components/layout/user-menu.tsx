'use client';

import { useTranslations } from 'next-intl';
import { LogIn, LogOut, User as UserIcon, Shield, Sparkles } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button, buttonVariants } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';

interface UserMenuProps {
  user: { email: string | null; avatarUrl: string | null } | null;
  isAdmin: boolean;
}

export function UserMenu({ user, isAdmin }: UserMenuProps) {
  const tNav = useTranslations('navigation');

  if (!user) {
    return (
      <Link href="/sign-in" className={buttonVariants({ variant: 'default', size: 'sm' })}>
        <LogIn className="size-4" />
        {tNav('sign_in')}
      </Link>
    );
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  const initial = (user.email ?? '?').slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full" />}>
        <Avatar className="size-8">
          {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/manage-profile" />}>
          <UserIcon className="size-4" />
          {tNav('manage_profile')}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/chat" />}>
          <Sparkles className="size-4" />
          {tNav('ai_chat')}
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <Shield className="size-4" />
            {tNav('admin')}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="size-4" />
          {tNav('sign_out')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
