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

// One confident accent + neutral. The icon already differentiates the
// kind of link (page / download all / individual file); chip color does
// not need to repeat that signal.
type LinkRole = 'primary' | 'neutral';

const linkRoleChip: Record<LinkRole, string> = {
  primary: 'bg-primary/10 text-primary',
  neutral: 'bg-muted text-muted-foreground',
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
    role: LinkRole;
    isFile?: boolean;
  }> = [
    {
      label: t('documents:document_public_link_page'),
      value: publicBasePath,
      icon: Link2,
      role: 'primary',
    },
    ...(doc.documentData?.length
      ? [
          {
            label: t('documents:document_public_link_download_all'),
            value: `${publicBasePath}/download`,
            icon: Download,
            role: 'primary' as const,
          },
        ]
      : []),
    ...(doc.documentData || []).map((file) => ({
      label: t('documents:document_public_link_file', { fileName: file.fileName }),
      value: `${publicBasePath}/files/${encodeURIComponent(buildPublicFileToken(file))}`,
      icon: FileDown,
      role: 'neutral' as const,
      isFile: true,
    })),
  ];

  const absolutePublicUrl = (path: string) => (publicOrigin ? `${publicOrigin}${path}` : path);

  const copyToClipboard = async (value: string) => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t('documents:document_public_link_copied'));
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
            {t('documents:document_public_links')}
            {isActive && (
              <Badge
                variant="outline"
                className="border-chart-2/40 bg-chart-2/10 text-[0.65rem] text-chart-2"
              >
                <Globe size={10} className="mr-1" aria-hidden="true" />
                {t('documents:document_public_status')}
              </Badge>
            )}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {publicLinksState.mode === 'active'
              ? t('documents:document_public_links_description')
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
            {t('documents:document_revoke_action')}
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
                className="group/link flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary/40 hover:shadow-sm"
              >
                <div
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-md',
                    linkRoleChip[link.role]
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
                  aria-label={`${t('documents:document_public_link_copy')}: ${link.label}`}
                  title={t('documents:document_public_link_copy')}
                  className={cn(
                    'shrink-0 min-h-11 min-w-11 gap-1.5 sm:min-h-8 sm:min-w-0',
                    'hover:border-primary hover:bg-primary hover:text-primary-foreground',
                    'focus-visible:border-primary focus-visible:bg-primary focus-visible:text-primary-foreground',
                    'active:scale-[0.97]'
                  )}
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {t('documents:document_public_link_copy')}
                  </span>
                  <span className="sr-only sm:hidden">
                    {t('documents:document_public_link_copy')}: {link.label}
                  </span>
                </Button>
              </li>
            );
          })}
          </ul>
        </>
      ) : (
        <Empty className="gap-4 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 md:p-8">
          <EmptyHeader className="gap-3">
            <EmptyMedia
              variant="icon"
              className="size-11 rounded-full bg-primary/10 text-primary [&_svg:not([class*='size-'])]:size-5"
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
                  {t('documents:document_publish_action')}
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
                  {t('documents:document_unrevoke_action')}
                </Button>
              )}
            </EmptyContent>
          )}
        </Empty>
      )}
    </Card>
  );
};
