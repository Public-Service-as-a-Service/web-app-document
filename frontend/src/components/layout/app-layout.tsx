'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import SidebarNav from './sidebar-nav';
import MobileBottomNav from './mobile-bottom-nav';
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

const TenantMark: React.FC<{ tenant: ReturnType<typeof useTenant> }> = ({ tenant }) => (
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
);

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
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <a
        href="#main"
        className="sr-only rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {t('common:skip_to_content')}
      </a>

      <aside
        aria-label={t('common:sidebar_aria_label')}
        className="hidden w-[232px] shrink-0 flex-col border-r border-border bg-background md:flex"
      >
        <Link
          href={`/${locale}`}
          className="flex h-[60px] shrink-0 items-center gap-2.5 border-b border-border px-4 no-underline"
          aria-label={tenant.appName}
        >
          <TenantMark tenant={tenant} />
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            {tenant.appName}
          </span>
        </Link>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <SidebarNav locale={locale} />
        </div>
        <div className="shrink-0 px-4 pb-5 pt-3 text-[11px] leading-relaxed text-muted-foreground">
          <p className="font-mono uppercase tracking-[0.06em]">Sundsvalls kommun</p>
          <p className="mt-0.5 text-muted-foreground/70">Styrande dokument</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[56px] shrink-0 items-center justify-between gap-2 border-b border-border bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:h-[60px] md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('common:sidebar_toggle')}
                  className="-ml-2"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="border-b border-border">
                  <SheetTitle className="flex items-center gap-2.5 text-left">
                    <TenantMark tenant={tenant} />
                    <span className="text-[15px] font-semibold tracking-[-0.01em]">
                      {tenant.appName}
                    </span>
                  </SheetTitle>
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
              className="flex items-center gap-2 no-underline"
              aria-label={tenant.appName}
            >
              <TenantMark tenant={tenant} />
              <span className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
                {tenant.appName}
              </span>
            </Link>
          </div>
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground md:inline">
            {tenant.logo.alt}
          </span>
          <UserMenu />
        </header>

        <main
          id="main"
          aria-label={t('common:main_aria_label')}
          tabIndex={-1}
          className="flex-1 scroll-mt-20 p-4 pb-24 focus-visible:outline-none md:overflow-auto md:p-6 md:pb-10 lg:p-8"
        >
          {children}
        </main>

        <MobileBottomNav locale={locale} onMoreClick={() => setMobileNavOpen(true)} />
      </div>
    </div>
  );
};

export default AppLayout;
