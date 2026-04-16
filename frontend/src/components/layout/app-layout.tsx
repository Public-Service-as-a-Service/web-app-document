'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import SidebarNav from './sidebar-nav';
import UserMenu from '@components/user-menu/user-menu';
import { useTenant } from '@components/tenant-provider/tenant-provider';
import { Button } from '@components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@components/ui/sheet';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const params = useParams();
  const pathname = usePathname();
  const locale = (params?.locale as string) || 'sv';
  const tenant = useTenant();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close mobile drawer on route change — effect is the right tool here:
  // pathname is an external value we react to, not something derivable in render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#main"
        className="sr-only rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {t('common:skip_to_content')}
      </a>
      <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/70 md:px-6">
        <div className="flex items-center gap-2">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label={t('common:sidebar_toggle')}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b border-border">
                <SheetTitle>{tenant.appName}</SheetTitle>
                <SheetDescription className="sr-only">
                  {t('common:sidebar_description')}
                </SheetDescription>
              </SheetHeader>
              <div className="px-3 py-4">
                <SidebarNav locale={locale} />
              </div>
            </SheetContent>
          </Sheet>
          <Link
            href={`/${locale}`}
            className="inline-flex h-14 items-center gap-3 no-underline"
            aria-label={tenant.appName}
          >
            <span
              role="img"
              aria-label={tenant.logo.alt}
              className="block shrink-0 bg-foreground"
              style={{
                width: tenant.logo.width,
                height: tenant.logo.height,
                maskImage: `url(${tenant.logo.src})`,
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskImage: `url(${tenant.logo.src})`,
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
              }}
            />
            <span className="text-base font-bold leading-none text-foreground sm:text-lg">
              {tenant.appName}
            </span>
          </Link>
        </div>
        <UserMenu />
      </header>
      <div className="flex flex-1">
        <aside
          aria-label={t('common:sidebar_aria_label')}
          className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground md:block"
        >
          <SidebarNav locale={locale} />
        </aside>
        <main
          id="main"
          aria-label={t('common:main_aria_label')}
          tabIndex={-1}
          className="flex-1 overflow-auto scroll-mt-20 p-4 md:p-6 lg:p-8 focus-visible:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
