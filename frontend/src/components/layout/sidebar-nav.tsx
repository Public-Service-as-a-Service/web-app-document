'use client';

import { useTranslation } from 'react-i18next';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, FileText, FileUser, Building2, FilePlus, Settings } from 'lucide-react';

interface SidebarNavProps {
  locale: string;
}

const SidebarNav: React.FC<SidebarNavProps> = ({ locale }) => {
  const { t } = useTranslation();
  const pathname = usePathname();

  const navItems = [
    {
      href: `/${locale}`,
      label: t('common:nav_dashboard'),
      icon: LayoutDashboard,
      match: 'exact' as const,
    },
    {
      href: `/${locale}/documents`,
      label: t('common:nav_documents'),
      icon: FileText,
      match: 'exact' as const,
    },
    {
      href: `/${locale}/my-documents`,
      label: t('common:nav_my_documents'),
      icon: FileUser,
      match: 'exact' as const,
    },
    {
      href: `/${locale}/organization`,
      label: t('common:nav_organization'),
      icon: Building2,
      match: 'prefix' as const,
    },
    {
      href: `/${locale}/documents/create`,
      label: t('common:nav_create_document'),
      icon: FilePlus,
      match: 'exact' as const,
    },
    {
      href: `/${locale}/admin/document-types`,
      label: t('common:nav_document_types'),
      icon: Settings,
      match: 'prefix' as const,
    },
  ];

  const isActive = (href: string, match: 'exact' | 'prefix') => {
    if (match === 'exact') return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <nav aria-label={t('common:sidebar_nav_aria_label')} className="flex flex-col gap-0.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href, item.match);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm leading-5 no-underline outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
              active
                ? 'bg-primary/10 font-semibold text-primary before:absolute before:left-0 before:top-1/2 before:h-6 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default SidebarNav;
