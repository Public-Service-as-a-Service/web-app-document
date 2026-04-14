'use client';

import { ReactNode } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import SidebarNav from './sidebar-nav';
import UserMenu from '@components/user-menu/user-menu';
import { useTenant } from '@components/tenant-provider/tenant-provider';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const params = useParams();
  const locale = (params?.locale as string) || 'sv';
  const tenant = useTenant();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-border bg-card px-6">
        <Link href={`/${locale}`} className="inline-flex h-14 items-center gap-3 no-underline">
          <span
            role="img"
            aria-label={tenant.logo.alt}
            className="shrink-0 block bg-foreground"
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
          <span className="text-lg font-bold leading-none text-foreground">{tenant.appName}</span>
        </Link>
        <UserMenu />
      </header>
      <div className="flex flex-1">
        <aside
          aria-label="Sidnavigering"
          className="w-64 shrink-0 border-r border-border bg-card py-4 px-3"
        >
          <SidebarNav locale={locale} />
        </aside>
        <main aria-label="Huvudinnehåll" className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
