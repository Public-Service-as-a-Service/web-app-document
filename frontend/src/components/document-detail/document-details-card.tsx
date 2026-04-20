'use client';

import { useTranslation } from 'react-i18next';
import { Archive, Building2, CalendarClock, Copy, Tag, UserCircle } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { Input } from '@components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import { Textarea } from '@components/ui/textarea';
import { DocumentStatusBadge } from '@components/document-status/document-status-badge';
import type { DocumentTypeDto } from '@data-contracts/backend/data-contracts';
import { displayUsername } from '@utils/display-username';
import dayjs from 'dayjs';
import { DetailLabel } from './detail-label';
import { formatDateDisplay } from './document-detail-helpers';
import { useDocumentDetail } from './document-detail-context';

interface DocumentDetailsCardProps {
  types: DocumentTypeDto[];
  onCopyPublicLink: () => void;
}

export const DocumentDetailsCard = ({ types, onCopyPublicLink }: DocumentDetailsCardProps) => {
  const { t } = useTranslation();
  const { doc, canEdit, isPublished, editDraft } = useDocumentDetail();
  const { editing, draft, setType, setDescription, setValidFrom, setValidTo } = editDraft;

  return (
    <Card className="gap-0 border-0 p-6">
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="min-w-0">
          <DetailLabel icon={Tag}>{t('common:documents_type')}</DetailLabel>
          {canEdit && editing ? (
            <Select value={draft.type} onValueChange={setType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('common:document_create_type_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {types.map((dt) => (
                  <SelectItem key={dt.type} value={dt.type}>
                    {dt.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="truncate text-sm" title={doc.type}>
              {types.find((dt) => dt.type === doc.type)?.displayName || doc.type}
            </p>
          )}
        </div>
        <div className="min-w-0">
          <DetailLabel icon={UserCircle}>{t('common:documents_created_by')}</DetailLabel>
          <p className="truncate text-sm" title={doc.createdBy}>
            {displayUsername(doc.createdBy)}
          </p>
          {doc.updatedBy && doc.updatedBy !== doc.createdBy && (
            <p className="mt-1 truncate text-xs text-muted-foreground" title={doc.updatedBy}>
              {t('common:document_updated_by')}: {displayUsername(doc.updatedBy)}
            </p>
          )}
        </div>
        <div className="min-w-0">
          <DetailLabel icon={Building2}>{t('common:document_department')}</DetailLabel>
          <p className="truncate text-sm">
            {doc.metadataList?.find((m) => m.key === 'departmentOrgName')?.value || '—'}
          </p>
        </div>
      </div>

      {/* Status strip: lifecycle status + archive badge. Status is read-only
          from the UI — it's derived upstream from the validity window and
          review workflows. */}
      <div
        className="mt-4 flex flex-wrap items-center gap-2"
        role="group"
        aria-label={t('common:document_status_strip_aria')}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('common:document_status_heading')}
        </span>
        <DocumentStatusBadge status={doc.status} size="md" />
        {doc.archive && (
          <Badge variant="outline" className="border-chart-3/40 bg-chart-3/10 text-chart-3">
            <Archive size={11} className="mr-1" aria-hidden="true" />
            {t('common:document_archive')}
          </Badge>
        )}
        {isPublished && !editing && (
          <Button variant="secondary" size="xs" onClick={onCopyPublicLink}>
            <Copy className="mr-1 h-3 w-3" />
            {t('common:document_public_link_copy')}
          </Button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
        <div className="min-w-0">
          <DetailLabel icon={CalendarClock}>{t('common:documents_created')}</DetailLabel>
          <p className="text-sm tabular-nums">
            {dayjs(doc.created).format('YYYY-MM-DD HH:mm')}
          </p>
        </div>
        <div className="min-w-0">
          <DetailLabel icon={CalendarClock}>{t('common:document_valid_from')}</DetailLabel>
          {canEdit && editing ? (
            <Input
              type="date"
              value={draft.validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              aria-label={t('common:document_valid_from')}
            />
          ) : (
            <p className="text-sm tabular-nums text-muted-foreground">
              {formatDateDisplay(doc.validFrom, t('common:document_valid_not_set'))}
            </p>
          )}
        </div>
        <div className="min-w-0">
          <DetailLabel icon={CalendarClock}>{t('common:document_valid_to')}</DetailLabel>
          {canEdit && editing ? (
            <Input
              type="date"
              value={draft.validTo}
              onChange={(e) => setValidTo(e.target.value)}
              aria-label={t('common:document_valid_to')}
            />
          ) : (
            <p className="text-sm tabular-nums text-muted-foreground">
              {formatDateDisplay(doc.validTo, t('common:document_valid_not_set'))}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('common:documents_description')}
        </p>
        {canEdit && editing ? (
          <Textarea
            className="w-full"
            value={draft.description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        ) : (
          <p className="text-sm whitespace-pre-wrap">{doc.description}</p>
        )}
      </div>
    </Card>
  );
};
