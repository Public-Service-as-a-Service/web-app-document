'use client';

import { useTranslation } from 'react-i18next';
import { Archive, Copy, ExternalLink } from 'lucide-react';
import { METADATA_KEYS, getMetadataValue } from '@utils/document-metadata';
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
import { EmployeeName } from '@components/user-display/employee-name';
import type { DocumentTypeDto } from '@data-contracts/backend/data-contracts';
import dayjs from 'dayjs';
import { DetailItem, DetailList, SectionHeading } from './detail-section';
import { formatDateDisplay } from './document-detail-helpers';
import { useDocumentDetail } from './document-detail-context';

const hasTitleField = (doc: { title?: string | null }) =>
  typeof doc.title === 'string' && doc.title.length > 0;

interface DocumentDetailsCardProps {
  types: DocumentTypeDto[];
  onCopyPublicLink: () => void;
}

export const DocumentDetailsCard = ({ types, onCopyPublicLink }: DocumentDetailsCardProps) => {
  const { t } = useTranslation();
  const { doc, canEdit, isPublished, editDraft } = useDocumentDetail();
  const {
    editing,
    draft,
    setTitle,
    setType,
    setDescription,
    setValidFrom,
    setValidTo,
    setCaseNumber,
    setCaseUrl,
  } = editDraft;

  const caseNumber = getMetadataValue(doc.metadataList, METADATA_KEYS.caseNumber);
  const caseUrl = getMetadataValue(doc.metadataList, METADATA_KEYS.caseUrl);
  const departmentName = getMetadataValue(doc.metadataList, METADATA_KEYS.departmentOrgName);
  const showCaseSection = editing || !!caseNumber || !!caseUrl;
  const typeLabel = types.find((dt) => dt.type === doc.type)?.displayName || doc.type;

  return (
    <Card className="gap-0 border-0 p-6">
      {/* Status row pinned to the top — the title itself lives in the page
          header, so this card is purely metadata. */}
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <DocumentStatusBadge status={doc.status} size="md" />
        {doc.archive && (
          <Badge variant="outline" className="border-chart-3/40 bg-chart-3/10 text-chart-3">
            <Archive size={11} className="mr-1" aria-hidden="true" />
            {t('documents:document_archive')}
          </Badge>
        )}
        {isPublished && !editing && (
          <Button
            variant="secondary"
            size="xs"
            onClick={onCopyPublicLink}
            className="ml-auto"
          >
            <Copy className="mr-1 h-3 w-3" />
            {t('documents:document_public_link_copy')}
          </Button>
        )}
      </div>

      {(canEdit && editing) || hasTitleField(doc) ? (
        <>
          <SectionHeading>{t('documents:document_title_label')}</SectionHeading>
          {canEdit && editing ? (
            <Input
              value={draft.title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
              placeholder={t('documents:document_title_placeholder')}
              aria-label={t('documents:document_title_label')}
            />
          ) : (
            <p
              className="line-clamp-3 break-words text-sm leading-relaxed text-foreground"
              title={doc.title ?? undefined}
            >
              {doc.title}
            </p>
          )}
        </>
      ) : null}

      <SectionHeading>{t('documents:document_section_details')}</SectionHeading>
      <DetailList>
        <DetailItem label={t('documents:documents_reg_number')}>
          <span className="font-mono tracking-wide">{doc.registrationNumber}</span>
        </DetailItem>

        <DetailItem label={t('documents:documents_type')}>
          {canEdit && editing ? (
            <Select value={draft.type} onValueChange={setType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('documents:document_create_type_placeholder')} />
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
            <span className="truncate" title={doc.type}>
              {typeLabel}
            </span>
          )}
        </DetailItem>

        <DetailItem label={t('documents:documents_created')}>
          <span className="tabular-nums">{dayjs(doc.created).format('YYYY-MM-DD HH:mm')}</span>{' '}
          <span className="text-muted-foreground">{t('common:by')}</span>{' '}
          <EmployeeName personId={doc.createdBy} />
        </DetailItem>

        {doc.updatedBy && doc.updatedBy !== doc.createdBy && (
          <DetailItem label={t('documents:document_updated_by')}>
            <EmployeeName personId={doc.updatedBy} />
          </DetailItem>
        )}

        <DetailItem label={t('documents:document_department')}>
          {departmentName ? (
            <span className="truncate">{departmentName}</span>
          ) : (
            <span className="italic text-muted-foreground">
              {t('documents:document_department_missing')}
            </span>
          )}
        </DetailItem>

        <DetailItem label={t('documents:document_valid_from')}>
          {canEdit && editing ? (
            <Input
              type="date"
              value={draft.validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              aria-label={t('documents:document_valid_from')}
            />
          ) : (
            <span className="tabular-nums text-muted-foreground">
              {formatDateDisplay(doc.validFrom, t('documents:document_valid_not_set'))}
            </span>
          )}
        </DetailItem>

        <DetailItem label={t('documents:document_valid_to')}>
          {canEdit && editing ? (
            <Input
              type="date"
              value={draft.validTo}
              onChange={(e) => setValidTo(e.target.value)}
              aria-label={t('documents:document_valid_to')}
            />
          ) : (
            <span className="tabular-nums text-muted-foreground">
              {formatDateDisplay(doc.validTo, t('documents:document_valid_not_set'))}
            </span>
          )}
        </DetailItem>
      </DetailList>

      {showCaseSection && (
        <>
          <SectionHeading>{t('documents:document_section_case')}</SectionHeading>
          <DetailList>
            <DetailItem label={t('documents:document_case_number_label')}>
              {canEdit && editing ? (
                <Input
                  value={draft.caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  placeholder={t('documents:document_case_number_placeholder')}
                  aria-label={t('documents:document_case_number_label')}
                />
              ) : caseNumber ? (
                <span className="truncate" title={caseNumber}>
                  {caseNumber}
                </span>
              ) : (
                <span className="italic text-muted-foreground">
                  {t('documents:document_case_number_missing')}
                </span>
              )}
            </DetailItem>

            <DetailItem label={t('documents:document_case_url_label')}>
              {canEdit && editing ? (
                <Input
                  value={draft.caseUrl}
                  onChange={(e) => setCaseUrl(e.target.value)}
                  type="url"
                  inputMode="url"
                  placeholder={t('documents:document_case_url_placeholder')}
                  aria-label={t('documents:document_case_url_label')}
                />
              ) : caseUrl ? (
                <a
                  href={caseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 break-all text-primary underline-offset-2 hover:underline"
                  title={caseUrl}
                >
                  <span className="truncate">{caseUrl}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                </a>
              ) : (
                <span className="italic text-muted-foreground">
                  {t('documents:document_case_url_missing')}
                </span>
              )}
            </DetailItem>
          </DetailList>
        </>
      )}

      <SectionHeading>{t('documents:documents_description')}</SectionHeading>
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
    </Card>
  );
};
