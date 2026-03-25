'use client';

import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@sk-web-gui/react';
import { FlaskConical } from 'lucide-react';
import SidebarNav from './sidebar-nav';
import ThemeToggle from '@components/theme-toggle/theme-toggle';

const isMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const params = useParams();
  const locale = (params?.locale as string) || 'sv';

  return (
    <div className="flex min-h-screen flex-col bg-background-content">
      {isMockData && (
        <div className="flex items-center justify-center gap-[0.6rem] bg-warning-surface-primary px-[1.6rem] py-[0.6rem] text-[1.3rem] font-medium text-warning">
          <FlaskConical size={14} />
          Mockdata aktivt — ingen riktig data visas
        </div>
      )}
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-divider bg-background-100 px-[2.4rem]">
        <Link href={`/${locale}`} className="inline-flex h-[6rem] items-center gap-[1.2rem] no-underline">
          <Logo variant="symbol" className="h-[4rem] w-auto shrink-0 [&_svg]:h-[4rem] [&_svg]:w-auto" />
          <span className="text-[1.8rem] font-bold leading-none text-dark-primary">{t('common:title')}</span>
        </Link>
        <ThemeToggle />
      </header>
      <div className="flex flex-1">
        <aside aria-label="Sidnavigering" className="w-[26rem] shrink-0 border-r border-divider bg-background-100 py-[1.6rem] px-[1.2rem]">
          <SidebarNav locale={locale} />
        </aside>
        <main aria-label="Huvudinnehåll" className="flex-1 overflow-auto p-[3.2rem]">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
