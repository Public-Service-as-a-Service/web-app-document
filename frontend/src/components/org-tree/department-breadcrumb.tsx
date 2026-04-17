'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@components/ui/breadcrumb';
import { useOrganizationStore } from '@stores/organization-store';
import type { OrgNodeDto } from '@data-contracts/backend/data-contracts';

interface DepartmentBreadcrumbProps {
  orgId: number;
  orgName: string;
}

export function DepartmentBreadcrumb({ orgId, orgName }: DepartmentBreadcrumbProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = (params?.locale as string) || 'sv';
  const flatNodes = useOrganizationStore((s) => s.flatNodes);

  const ancestors = useMemo<OrgNodeDto[]>(() => {
    const nodeById = new Map(flatNodes.map((n) => [n.orgId, n]));
    const chain: OrgNodeDto[] = [];
    let current = nodeById.get(orgId);
    while (current && current.parentId) {
      const parent = nodeById.get(current.parentId);
      if (!parent) break;
      chain.unshift(parent);
      current = parent;
    }
    return chain;
  }, [flatNodes, orgId]);

  const navigateTo = (targetId: number, targetName: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('dept', String(targetId));
    next.set('name', targetName);
    router.replace(`/${locale}/organization?${next.toString()}`, { scroll: false });
  };

  const clearSelection = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('dept');
    next.delete('name');
    const q = next.toString();
    router.replace(`/${locale}/organization${q ? `?${q}` : ''}`, { scroll: false });
  };

  return (
    <Breadcrumb aria-label={t('common:breadcrumb_aria_label')}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            onClick={(e) => {
              e.preventDefault();
              clearSelection();
            }}
            href="#"
            className="cursor-pointer"
          >
            {t('common:org_title')}
          </BreadcrumbLink>
        </BreadcrumbItem>
        {ancestors.map((a) => (
          <span key={a.orgId} className="contents">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo(a.orgId, a.orgName);
                }}
                href="#"
                className="cursor-pointer"
              >
                {a.orgName}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </span>
        ))}
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{orgName}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
