'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Copy, Download, FileDown, Globe, Link2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@components/ui/alert';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@components/ui/empty';
import { cn } from '@lib/utils';
import { DocumentStatusEnum } from '@data-contracts/backend/data-contracts';
import { buildPublicFileToken } from './document-detail-helpers';
import { derivePublicLinksState } from './public-links-state';
import { useDocumentDetail } from './document-detail-context';

type LinkTone = 'primary' | 'emerald' | 'slate';

const linkToneChip: Record<LinkTone, string> = {
  primary: 'bg-primary/10 text-primary',
  emerald: 'bg-chart-2/10 text-chart-2',
  slate: 'bg-muted text-muted-foreground',
};

const linkToneHover: Record<LinkTone, string> = {
  primary: 'hover:border-primary/50',
  emerald: 'hover:border-chart-2/50',
  slate: 'hover:border-border/80',
};

interface PublicLinksSectionProps {
  publicOrigin: string;
  publishing: boolean;
  revoking: boolean;
  unrevoking: boolean;
  onPublish: () => void;
  onRequestRevoke: () => void;
  onRequestUnrevoke: () => void;
}

export const PublicLinksSection = ({
  publicOrigin,
  publishing,
  revoking,
  unrevoking,
  onPublish,
  onRequestRevoke,
  onRequestUnrevoke,
}: PublicLinksSectionProps) => {
  const { t } = useTranslation();
  const { doc, registrationNumber, selectedRevision, isActive, isPublished, canEdit, editDraft } =
    useDocumentDetail();
  const { editing } = editDraft;

  const publicBasePath =
    selectedRevision !== null
      ? `/d/${registrationNumber}/v/${selectedRevision}`
      : `/d/${registrationNumber}`;

  const publicLinksState = useMemo(() => derivePublicLinksState(doc, t), [doc, t]);

  const publicLinkRows: Array<{
    label: string;
    value: string;
    icon: typeof Link2;
    tone: LinkTone;
    isFile?: boolean;
  }> = [
    {
      label: t('common:document_public_link_page'),
      value: publicBasePath,
      icon: Link2,
      tone: 'primary',
    },
    ...(doc.documentData?.length
      ? [
          {
            label: t('common:document_public_link_download_all'),
            value: `${publicBasePath}/download`,
            icon: Download,
            tone: 'emerald' as const,
          },
        ]
      : []),
    ...(doc.documentData || []).map((file) => ({
      label: t('common:document_public_link_file', { fileName: file.fileName }),
      value: `${publicBasePath}/files/${encodeURIComponent(buildPublicFileToken(file))}`,
      icon: FileDown,
      tone: 'slate' as const,
      isFile: true,
    })),
  ];

  const absolutePublicUrl = (path: string) => (publicOrigin ? `${publicOrigin}${path}` : path);

  const copyToClipboard = async (value: string) => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t('common:document_public_link_copied'));
    } catch {
      toast.error(t('common:error_generic'));
    }
  };

  return (
    <Card className="gap-0 p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Link2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {t('common:document_public_links')}
            {isActive && (
              <Badge
                variant="outline"
                className="border-chart-2/40 bg-chart-2/10 text-[0.65rem] text-chart-2"
              >
                <Globe size={10} className="mr-1" aria-hidden="true" />
                {t('common:document_public_status')}
              </Badge>
            )}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {publicLinksState.mode === 'active'
              ? t('common:document_public_links_description')
              : publicLinksState.hint}
          </p>
        </div>
        {isPublished && canEdit && !editing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRequestRevoke}
            disabled={revoking}
            className="shrink-0 min-h-9 gap-1.5 hover:border-destructive hover:bg-destructive hover:text-destructive-foreground focus-visible:border-destructive focus-visible:bg-destructive focus-visible:text-destructive-foreground active:scale-[0.98]"
          >
            {revoking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {t('common:document_revoke_action')}
          </Button>
        )}
      </div>
      {publicLinksState.mode === 'active' ? (
        <>
          {publicLinksState.notice && (
            <Alert variant="info" className="mb-4">
              <CalendarClock aria-hidden="true" />
              <AlertTitle>{publicLinksState.notice.title}</AlertTitle>
              <AlertDescription>{publicLinksState.notice.hint}</AlertDescription>
            </Alert>
          )}
          <ul className="space-y-2">
          {publicLinkRows.map((link) => {
            const Icon = link.icon;
            const fullUrl = absolutePublicUrl(link.value);
            return (
              <li
                key={link.value}
                className={cn(
                  'group/link flex items-center gap-3 rounded-lg border border-border bg-background p-3',
                  'transition-[border-color,box-shadow,background-color] duration-200 ease-out',
                  'hover:shadow-sm',
                  linkToneHover[link.tone]
                )}
              >
                <div
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-md',
                    'transition-transform duration-200 ease-out group-hover/link:scale-105',
                    linkToneChip[link.tone]
                  )}
                  aria-hidden="true"
                >
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'truncate text-sm font-medium text-foreground',
                      link.isFile && 'font-mono'
                    )}
                    title={link.label}
                  >
                    {link.label}
                  </p>
                  <p
                    className="truncate select-all font-mono text-[0.7rem] text-muted-foreground"
                    title={fullUrl}
                  >
                    {fullUrl}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(fullUrl)}
                  aria-label={`${t('common:document_public_link_copy')}: ${link.label}`}
                  title={t('common:document_public_link_copy')}
                  className={cn(
                    'shrink-0 min-h-11 min-w-11 gap-1.5 sm:min-h-8 sm:min-w-0',
                    'hover:border-primary hover:bg-primary hover:text-primary-foreground',
                    'focus-visible:border-primary focus-visible:bg-primary focus-visible:text-primary-foreground',
                    'active:scale-[0.97]'
                  )}
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {t('common:document_public_link_copy')}
                  </span>
                  <span className="sr-only sm:hidden">
                    {t('common:document_public_link_copy')}: {link.label}
                  </span>
                </Button>
              </li>
            );
          })}
          </ul>
        </>
      ) : (
        <Empty className="gap-4 border bg-muted/30 px-4 py-8 md:p-8">
          <EmptyHeader className="gap-4">
            <EmptyMedia
              variant="icon"
              className="size-12 rounded-full bg-primary/10 text-primary ring-4 ring-primary/5 [&_svg:not([class*='size-'])]:size-5"
            >
              <Link2 />
            </EmptyMedia>
            <EmptyTitle className="text-sm">{publicLinksState.title}</EmptyTitle>
            <EmptyDescription className="text-xs">{publicLinksState.hint}</EmptyDescription>
          </EmptyHeader>
          {((publicLinksState.showPublishButton ||
            doc.status === DocumentStatusEnum.REVOKED) &&
            canEdit &&
            !editing) && (
            <EmptyContent>
              {publicLinksState.showPublishButton && (
                <Button
                  type="button"
                  onClick={onPublish}
                  disabled={publishing}
                  className="min-h-11 active:scale-[0.98]"
                >
                  {publishing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Globe className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  {t('common:document_publish_action')}
                </Button>
              )}
              {doc.status === DocumentStatusEnum.REVOKED && (
                <Button
                  type="button"
                  onClick={onRequestUnrevoke}
                  disabled={unrevoking}
                  className="min-h-11 active:scale-[0.98]"
                >
                  {unrevoking ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Globe className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  {t('common:document_unrevoke_action')}
                </Button>
              )}
            </EmptyContent>
          )}
        </Empty>
      )}
    </Card>
  );
};
