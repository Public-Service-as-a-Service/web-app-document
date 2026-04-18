'use client';

import { useTranslation } from 'react-i18next';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, FileText, FilePlus, FileUser, Menu } from 'lucide-react';

interface MobileBottomNavProps {
  locale: string;
  onMoreClick: () => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ locale, onMoreClick }) => {
  const { t } = useTranslation();
  const pathname = usePathname();

  const items = [
    {
      href: `/${locale}`,
      label: t('common:nav_dashboard'),
      icon: LayoutDashboard,
      match: (p: string) => p === `/${locale}`,
    },
    {
      href: `/${locale}/documents`,
      label: t('common:nav_documents'),
      icon: FileText,
      match: (p: string) =>
        p === `/${locale}/documents` ||
        (p.startsWith(`/${locale}/documents`) && !p.endsWith('/create')),
    },
    {
      href: `/${locale}/documents/create`,
      label: t('common:nav_create_document_short'),
      icon: FilePlus,
      match: (p: string) => p === `/${locale}/documents/create`,
    },
    {
      href: `/${locale}/my-documents`,
      label: t('common:nav_my_documents_short'),
      icon: FileUser,
      match: (p: string) => p === `/${locale}/my-documents`,
    },
  ];

  return (
    <nav
      aria-label={t('common:mobile_nav_aria_label')}
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      style={{ minHeight: 64, paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map((it) => {
        const active = it.match(pathname);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium no-underline outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
              active ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
            <span className="truncate">{it.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMoreClick}
        className="flex min-h-11 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium text-muted-foreground no-underline outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
        <span className="truncate">{t('common:mobile_nav_more')}</span>
      </button>
    </nav>
  );
};

export default MobileBottomNav;
