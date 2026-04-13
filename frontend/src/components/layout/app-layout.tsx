'use client';

import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FlaskConical } from 'lucide-react';
import SidebarNav from './sidebar-nav';
import ThemeToggle from '@components/theme-toggle/theme-toggle';
import { useTenant } from '@components/tenant-provider/tenant-provider';

const isMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const params = useParams();
  const locale = (params?.locale as string) || 'sv';
  const tenant = useTenant();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {isMockData && (
        <div className="flex items-center justify-center gap-1.5 bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          <FlaskConical size={14} />
          Mockdata aktivt — ingen riktig data visas
        </div>
      )}
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-border bg-card px-6">
        <Link href={`/${locale}`} className="inline-flex h-14 items-center gap-3 no-underline">
          <Image
            src={tenant.logo.src}
            alt={tenant.logo.alt}
            width={tenant.logo.width}
            height={tenant.logo.height}
            className="shrink-0"
          />
          <span className="text-lg font-bold leading-none text-foreground">{tenant.appName}</span>
        </Link>
        <ThemeToggle />
      </header>
      <div className="flex flex-1">
        <aside aria-label="Sidnavigering" className="w-64 shrink-0 border-r border-border bg-card py-4 px-3">
          <SidebarNav locale={locale} />
        </aside>
        <main aria-label="Huvudinnehåll" className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
