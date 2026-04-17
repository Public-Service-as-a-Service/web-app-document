'use client';

import { useTranslation } from 'react-i18next';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { Avatar, AvatarFallback } from '@components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu';
import { useUserStore } from '@stores/user-store';

const themeOptions = [
  { value: 'light', Icon: Sun, labelKey: 'theme_light' },
  { value: 'dark', Icon: Moon, labelKey: 'theme_dark' },
  { value: 'system', Icon: Monitor, labelKey: 'theme_system' },
] as const;

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

const UserMenu = () => {
  const { t } = useTranslation();
  const params = useParams();
  const locale = (params?.locale as string) || 'sv';
  const user = useUserStore((s) => s.user);
  const { theme, setTheme } = useTheme();

  const initials = getInitials(user.firstName, user.lastName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('common:user_menu')}
        >
          <Avatar size="sm">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm text-muted-foreground sm:inline">{user.name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.username}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {t('common:theme')}
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme ?? 'system'} onValueChange={setTheme}>
            {themeOptions.map(({ value, Icon, labelKey }) => (
              <DropdownMenuRadioItem key={value} value={value} className="gap-2">
                <Icon size={16} />
                <span>{t(`common:${labelKey}`)}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild variant="destructive">
          <Link href={`/${locale}/logout`} className="gap-2 no-underline">
            <LogOut size={16} />
            <span>{t('common:logout_button')}</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
