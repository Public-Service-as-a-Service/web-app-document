'use client';

import type {} from 'react/canary';

import { ViewTransition } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { ArrowLeft, Edit, Loader2, Save, X } from 'lucide-react';
import { Button } from '@components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@components/ui/breadcrumb';
import { CopyToClipboard } from '@components/copy-to-clipboard/copy-to-clipboard';
import { sanitizeVTName } from '@lib/utils';
import { toDisplayRevision } from '@utils/document-revision';
import dayjs from 'dayjs';
import { useDocumentDetail } from './document-detail-context';

interface DocumentHeaderBarProps {
  saving: boolean;
  showLatestPill: boolean;
  showFirstPill: boolean;
  onBack: () => void;
  onRequestSave: () => void;
}

export const DocumentHeaderBar = ({
  saving,
  showLatestPill,
  showFirstPill,
  onBack,
  onRequestSave,
}: DocumentHeaderBarProps) => {
  const { t } = useTranslation();
  const { doc, locale, canEdit, editDraft } = useDocumentDetail();
  const { editing, startEditing, cancelEditing } = editDraft;

  return (
    <>
      <div className="mb-4 flex flex-col gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/${locale}`}>{t('common:breadcrumb_home')}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/${locale}/documents`}>{t('common:documents_title')}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-mono">{doc.registrationNumber}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common:back')}
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <ViewTransition
              name={`doc-${sanitizeVTName(doc.registrationNumber)}-r${doc.revision}`}
              default="none"
              share={{
                'nav-forward': 'morph-forward',
                'nav-back': 'morph-back',
                default: 'morph',
              }}
            >
              <h1 className="truncate font-mono text-2xl font-bold">{doc.registrationNumber}</h1>
            </ViewTransition>
            <CopyToClipboard
              value={doc.registrationNumber}
              ariaLabel={t('common:copy_to_clipboard')}
            />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>
              {t('common:document_revision')} {toDisplayRevision(doc.revision)} &middot;{' '}
              {dayjs(doc.created).format('YYYY-MM-DD HH:mm')}
            </span>
            {showLatestPill && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {t('common:revision_latest')}
              </span>
            )}
            {showFirstPill && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {t('common:revision_first')}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canEdit &&
            (!editing ? (
              <Button variant="secondary" onClick={startEditing} className="w-full sm:w-auto">
                <Edit className="mr-2 h-4 w-4" />
                {t('common:document_edit')}
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={cancelEditing} className="flex-1 sm:flex-none">
                  <X className="mr-2 h-4 w-4" />
                  {t('common:cancel')}
                </Button>
                <Button onClick={onRequestSave} disabled={saving} className="flex-1 sm:flex-none">
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {t('common:document_save')}
                </Button>
              </>
            ))}
        </div>
      </div>
    </>
  );
};
