'use client';

import type {} from 'react/canary';

import { useEffect, useState, useRef, useCallback, ViewTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Textarea } from '@components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { ConfirmDialog } from '@components/ui/confirm-dialog';
import { ArrowLeft, Download, Trash2, Upload, Edit, Save, X, Plus, Loader2 } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@components/ui/breadcrumb';
import { CopyToClipboard } from '@components/copy-to-clipboard/copy-to-clipboard';
import Link from 'next/link';
import { useDocumentStore } from '@stores/document-store';
import { useDocumentTypeStore } from '@stores/document-type-store';
import { apiService, ApiResponse } from '@services/api-service';
import { cn, sanitizeVTName } from '@lib/utils';
import { useViewTransitionNav } from '@components/motion/directional-transition';
import type {
  PagedDocumentResponse,
  Document as DocType,
  DocumentMetadata,
} from '@interfaces/document.interface';
import dayjs from 'dayjs';
import { toast } from 'sonner';

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const SYSTEM_METADATA_KEYS = ['departmentOrgId', 'departmentOrgName'];

const DocumentDetailPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params?.locale as string;
  const registrationNumber = params?.registrationNumber as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigate = useViewTransitionNav();

  const { currentDocument, currentDocumentLoading, fetchDocument, fetchRevision, updateDocument } =
    useDocumentStore();
  const { types, fetchTypes } = useDocumentTypeStore();

  const handleBackToList = useCallback(() => {
    navigate(`/${locale}/documents`, 'nav-back');
  }, [navigate, locale]);
  const revisionParam = searchParams.get('revision');
  const parsedRevision = revisionParam !== null ? Number(revisionParam) : null;
  const selectedRevision =
    parsedRevision !== null && Number.isInteger(parsedRevision) && parsedRevision >= 0
      ? parsedRevision
      : null;

  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [metadataList, setMetadataList] = useState<DocumentMetadata[]>([]);
  const [saving, setSaving] = useState(false);
  const [revisions, setRevisions] = useState<DocType[]>([]);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  useEffect(() => {
    if (!registrationNumber) return;

    if (selectedRevision !== null) {
      fetchRevision(registrationNumber, selectedRevision);
    } else {
      fetchDocument(registrationNumber);
    }
  }, [registrationNumber, selectedRevision, fetchDocument, fetchRevision]);

  useEffect(() => {
    setEditing(false);
    setDeleteFileId(null);
  }, [selectedRevision]);

  useEffect(() => {
    if (currentDocument) {
      setDescription(currentDocument.description || '');
      setType(currentDocument.type || '');
      setMetadataList(
        (currentDocument.metadataList || []).filter((m) => !SYSTEM_METADATA_KEYS.includes(m.key))
      );
    }
  }, [currentDocument]);

  useEffect(() => {
    const loadRevisions = async () => {
      try {
        const res = await apiService.get<ApiResponse<PagedDocumentResponse>>(
          `documents/${registrationNumber}/revisions?size=50&sort=revision,desc`
        );
        setRevisions(res.data.data.documents || []);
      } catch {
        // ignore
      }
    };
    loadRevisions();
  }, [registrationNumber]);

  const handleSave = async () => {
    if (!currentDocument) return;
    setSaving(true);
    try {
      const systemMetadata = (currentDocument.metadataList || []).filter((m) =>
        SYSTEM_METADATA_KEYS.includes(m.key)
      );
      await updateDocument(registrationNumber, {
        createdBy: currentDocument.createdBy,
        description,
        type,
        metadataList: [...metadataList, ...systemMetadata],
      });
      setEditing(false);
      toast.success(t('common:document_save_success'));
    } catch {
      toast.error(t('common:document_save_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (documentDataId: string, fileName: string) => {
    try {
      const fileUrl =
        selectedRevision !== null
          ? `documents/${registrationNumber}/revisions/${selectedRevision}/files/${documentDataId}`
          : `documents/${registrationNumber}/files/${documentDataId}`;
      const res = await apiService.getBlob(fileUrl);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('common:document_file_download_error'));
    }
  };

  const handleSelectRevision = (revision: number) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('revision', String(revision));
    router.push(`/${locale}/documents/${registrationNumber}?${nextParams.toString()}`, {
      scroll: false,
    });
  };

  const handleBackToLatest = () => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('revision');
    const query = nextParams.toString();
    router.push(`/${locale}/documents/${registrationNumber}${query ? `?${query}` : ''}`, {
      scroll: false,
    });
  };

  const handleDeleteFile = async (documentDataId: string) => {
    try {
      await apiService.del(`documents/${registrationNumber}/files/${documentDataId}`);
      fetchDocument(registrationNumber);
      toast.success(t('common:document_file_delete_success'));
    } catch {
      toast.error(t('common:document_file_delete_error'));
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentDocument) return;

    const formData = new FormData();
    formData.append('document', JSON.stringify({ createdBy: currentDocument.createdBy }));
    formData.append('documentFile', file);

    try {
      await apiService.putFormData(`documents/${registrationNumber}/files`, formData);
      fetchDocument(registrationNumber);
      toast.success(t('common:document_file_upload_success'));
    } catch {
      toast.error(t('common:document_file_upload_error'));
    }
    e.target.value = '';
  };

  const updateMetadataField = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...metadataList];
    updated[index] = { ...updated[index], [field]: val };
    setMetadataList(updated);
  };

  if (currentDocumentLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentDocument) {
    return <p className="py-8 text-sm text-muted-foreground">{t('common:error_generic')}</p>;
  }

  const doc = currentDocument;
  const activeRevision = selectedRevision ?? doc.revision;
  const latestRevisionNumber = revisions.length
    ? Math.max(...revisions.map((r) => r.revision))
    : null;
  const firstRevisionNumber = revisions.length
    ? Math.min(...revisions.map((r) => r.revision))
    : null;
  const isViewingHistorical =
    selectedRevision !== null &&
    latestRevisionNumber !== null &&
    selectedRevision !== latestRevisionNumber;
  const canEdit = !isViewingHistorical;

  const showLatestPill =
    revisions.length > 1 &&
    latestRevisionNumber !== null &&
    doc.revision === latestRevisionNumber;
  const showFirstPill =
    revisions.length > 1 &&
    firstRevisionNumber !== null &&
    doc.revision === firstRevisionNumber &&
    doc.revision !== latestRevisionNumber;

  return (
    <div className="mx-auto max-w-5xl">
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
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToList}
          className="-ml-2 w-fit"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common:back')}
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
              {t('common:document_revision')} {doc.revision} &middot;{' '}
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
        <div className="flex shrink-0 gap-2">
          {canEdit &&
            (!editing ? (
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                {t('common:document_edit')}
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  <X className="mr-2 h-4 w-4" />
                  {t('common:cancel')}
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {t('common:document_save')}
                </Button>
              </>
            ))}
        </div>
      </div>

      {isViewingHistorical && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted px-4 py-3">
          <p className="text-sm font-medium">
            {t('common:document_viewing_revision', { revision: selectedRevision })}
          </p>
          <Button variant="secondary" size="sm" onClick={handleBackToLatest}>
            {t('common:document_back_to_latest')}
          </Button>
        </div>
      )}

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">{t('common:details')}</TabsTrigger>
          <TabsTrigger value="revisions">
            {t('common:document_revisions')} ({revisions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="mt-5 space-y-5">
            <section className="rounded-xl bg-card p-6 shadow-sm">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
                <div>
                  <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('common:documents_type')}
                  </p>
                  {canEdit && editing ? (
                    <Select value={type} onValueChange={setType}>
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
                    <p className="text-sm">
                      {types.find((t) => t.type === doc.type)?.displayName || doc.type}
                    </p>
                  )}
                </div>
                <div>
                  <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('common:documents_created_by')}
                  </p>
                  <p className="text-sm">{doc.createdBy}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('common:document_department')}
                  </p>
                  <p className="text-sm">
                    {doc.metadataList?.find((m) => m.key === 'departmentOrgName')?.value || '---'}
                  </p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('common:document_archive')}
                  </p>
                  <p className="text-sm">{doc.archive ? t('common:yes') : t('common:no')}</p>
                </div>
              </div>

              <div className="mt-5">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('common:documents_description')}
                </p>
                {canEdit && editing ? (
                  <Textarea
                    className="w-full"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{doc.description}</p>
                )}
              </div>
            </section>

            <section className="rounded-xl bg-card p-6 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold">{t('common:document_metadata')}</h3>
                {canEdit && editing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMetadataList([...metadataList, { key: '', value: '' }])}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t('common:document_metadata_add')}
                  </Button>
                )}
              </div>
              {metadataList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('common:document_metadata_empty')}
                </p>
              ) : canEdit && editing ? (
                <div className="space-y-2">
                  {metadataList.map((m, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        className="flex-1"
                        placeholder={t('common:document_metadata_key')}
                        value={m.key}
                        onChange={(e) => updateMetadataField(i, 'key', e.target.value)}
                      />
                      <Input
                        className="flex-1"
                        placeholder={t('common:document_metadata_value')}
                        value={m.value}
                        onChange={(e) => updateMetadataField(i, 'value', e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('common:documents_filter_chip_remove', {
                          label: m.key || `${t('common:document_metadata')} ${i + 1}`,
                        })}
                        onClick={() => setMetadataList(metadataList.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {metadataList.map((m, i) => (
                    <div key={i} className="min-w-0 rounded-lg bg-muted px-3 py-2">
                      <p className="truncate text-xs font-semibold text-foreground/75" title={m.key}>
                        {m.key}
                      </p>
                      <p className="break-all text-sm">{m.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl bg-card p-6 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold">
                  {t('common:document_files')} ({doc.documentData?.length || 0})
                </h3>
                {canEdit && (
                  <div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {t('common:document_files_upload')}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleUploadFile}
                      aria-label={t('common:document_files_upload')}
                    />
                  </div>
                )}
              </div>
              {!doc.documentData || doc.documentData.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('common:document_files_empty')}</p>
              ) : (
                <div className="space-y-2">
                  {doc.documentData.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent"
                    >
                      <div>
                        <p className="text-sm font-medium">{file.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.mimeType} &middot; {formatFileSize(file.fileSizeInBytes)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`${t('common:document_files_download')}: ${file.fileName}`}
                          onClick={() => handleDownload(file.id, file.fileName)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${t('common:document_files_delete')}: ${file.fileName}`}
                            onClick={() => setDeleteFileId(file.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </TabsContent>

        <TabsContent value="revisions">
          <div className="mt-5">
            {revisions.length === 0 ? (
              <p className="py-5 text-sm text-muted-foreground">
                {t('common:document_revisions_empty')}
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <table className="w-full" aria-label={t('common:document_revisions')}>
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {t('common:document_revision')}
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {t('common:documents_created')}
                      </th>
                      <th
                        scope="col"
                        className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell"
                      >
                        {t('common:documents_created_by')}
                      </th>
                      <th
                        scope="col"
                        className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground md:table-cell"
                      >
                        {t('common:documents_description')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {revisions.map((rev) => {
                      const isActive = activeRevision === rev.revision;
                      const isLatest = rev.revision === latestRevisionNumber;
                      const isFirst =
                        revisions.length > 1 &&
                        rev.revision === firstRevisionNumber &&
                        rev.revision !== latestRevisionNumber;
                      return (
                        <tr
                          key={rev.revision}
                          aria-current={isActive ? 'page' : undefined}
                          className={cn(
                            'group relative border-b border-border transition-colors last:border-0',
                            'hover:bg-accent focus-within:bg-accent',
                            'focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring',
                            isActive && 'bg-accent'
                          )}
                        >
                          <td className="px-4 py-3.5 text-sm font-semibold">
                            <button
                              type="button"
                              onClick={() => handleSelectRevision(rev.revision)}
                              className="relative inline-flex items-center gap-2 rounded-sm text-left outline-none after:absolute after:inset-0 after:cursor-pointer after:content-[''] focus-visible:outline-none"
                              aria-label={t('common:document_viewing_revision', {
                                revision: rev.revision,
                              })}
                            >
                              <span>{rev.revision}</span>
                              {isLatest && (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                  {t('common:revision_latest')}
                                </span>
                              )}
                              {isFirst && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                  {t('common:revision_first')}
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground">
                            {dayjs(rev.created).format('YYYY-MM-DD HH:mm')}
                          </td>
                          <td className="hidden px-4 py-3.5 text-sm sm:table-cell">
                            {rev.createdBy}
                          </td>
                          <td className="hidden px-4 py-3.5 text-sm md:table-cell">
                            {rev.description?.slice(0, 60)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteFileId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteFileId(null);
        }}
        title={t('common:document_files_delete_confirm')}
        description={t('common:document_files_delete_confirm')}
        confirmLabel={t('common:delete')}
        cancelLabel={t('common:cancel')}
        variant="destructive"
        onConfirm={() => {
          if (deleteFileId) handleDeleteFile(deleteFileId);
        }}
      />
    </div>
  );
};

export default DocumentDetailPage;
