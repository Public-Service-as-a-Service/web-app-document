'use client';

import type {} from 'react/canary';

import { useCallback, useEffect, useState, useRef, ViewTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@components/ui/button';
import { Textarea } from '@components/ui/textarea';
import { Switch } from '@components/ui/switch';
import { Label } from '@components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { ConfirmDialog } from '@components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@components/ui/dialog';
import FilePreview from '@components/file-preview/file-preview';
import {
  ArrowLeft,
  Download,
  Eye,
  Trash2,
  Upload,
  Edit,
  Save,
  X,
  Loader2,
  Copy,
  History,
  Archive,
  Globe,
  Tag,
  UserCircle,
  Building2,
  Link2,
  FileText as FileTextIcon,
  FileDown,
} from 'lucide-react';
import { Badge } from '@components/ui/badge';
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
import { useUserStore } from '@stores/user-store';
import { apiService, ApiResponse } from '@services/api-service';
import { cn, sanitizeVTName } from '@lib/utils';
import { useViewTransitionNav } from '@components/motion/directional-transition';
import type {
  DocumentDto as DocType,
  DocumentMetadataDto,
  PagedDocumentResponseDto,
} from '@data-contracts/backend/data-contracts';
import {
  ResponsibilitiesInput,
  type ResponsibilitiesInputHandle,
} from '@components/responsibilities-input/responsibilities-input';
import { ResponsibilityCard } from '@components/responsibility-card/responsibility-card';
import { toDisplayRevision } from '@utils/document-revision';
import { displayUsername } from '@utils/display-username';
import { supportsPreview } from '@utils/file-preview-support';
import dayjs from 'dayjs';
import { toast } from 'sonner';

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const RESERVED_METADATA_KEYS = ['published'];

const isPublished = (metadataList: DocumentMetadataDto[] = []) =>
  metadataList.some((m) => m.key === 'published' && m.value.trim().toLowerCase() === 'true');

const buildPublicFileToken = (file: { id: string; fileName: string }) => {
  const json = JSON.stringify({ id: file.id, fileName: file.fileName });
  const bytes = new TextEncoder().encode(json);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const DocumentDetailPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params?.locale as string;
  const registrationNumber = params?.registrationNumber as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const responsibilitiesRef = useRef<ResponsibilitiesInputHandle>(null);

  const navigate = useViewTransitionNav();

  const {
    currentDocument,
    currentDocumentLoading,
    fetchDocument,
    fetchRevision,
    updateDocument,
    updateResponsibilities,
  } = useDocumentStore();
  const { types, fetchTypes } = useDocumentTypeStore();
  const { user } = useUserStore();

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
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [revisions, setRevisions] = useState<DocType[]>([]);
  const [pendingDeleteFileId, setPendingDeleteFileId] = useState<string | null>(null);
  const [pendingDeleteFileIds, setPendingDeleteFileIds] = useState<string[]>([]);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<
    { id: string; fileName: string; mimeType: string } | null
  >(null);
  const [publicOrigin, setPublicOrigin] = useState('');
  const [editingResponsibilities, setEditingResponsibilities] = useState(false);
  const [responsibilitiesDraft, setResponsibilitiesDraft] = useState<string[]>([]);
  const [savingResponsibilities, setSavingResponsibilities] = useState(false);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  useEffect(() => {
    setPublicOrigin(window.location.origin);
  }, []);

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
    setPendingDeleteFileId(null);
    setPendingDeleteFileIds([]);
    setPendingUploadFiles([]);
  }, [selectedRevision]);

  useEffect(() => {
    if (currentDocument) {
      setDescription(currentDocument.description || '');
      setType(currentDocument.type || '');
      setPublished(isPublished(currentDocument.metadataList));
      setPendingDeleteFileId(null);
      setPendingDeleteFileIds([]);
      setPendingUploadFiles([]);
      setResponsibilitiesDraft(
        (currentDocument.responsibilities || []).map((r) => r.username)
      );
      setEditingResponsibilities(false);
    }
  }, [currentDocument]);

  const resetEditDraft = useCallback(() => {
    if (!currentDocument) return;
    setDescription(currentDocument.description || '');
    setType(currentDocument.type || '');
    setPublished(isPublished(currentDocument.metadataList));
    setPendingDeleteFileId(null);
    setPendingDeleteFileIds([]);
    setPendingUploadFiles([]);
  }, [currentDocument]);

  const loadRevisions = useCallback(async () => {
    try {
      const res = await apiService.get<ApiResponse<PagedDocumentResponseDto>>(
        `documents/${registrationNumber}/revisions?size=50&sort=revision,desc`
      );
      setRevisions(res.data.data.documents || []);
    } catch {
      // ignore
    }
  }, [registrationNumber]);

  useEffect(() => {
    loadRevisions();
  }, [loadRevisions]);

  const handleSave = async () => {
    if (!currentDocument) return;
    setSaving(true);
    try {
      const currentPublished = isPublished(currentDocument.metadataList);
      const hasDocumentChanges =
        description !== (currentDocument.description || '') ||
        type !== (currentDocument.type || '') ||
        published !== currentPublished;
      const hasFileChanges = pendingDeleteFileIds.length > 0 || pendingUploadFiles.length > 0;

      if (hasDocumentChanges) {
        const preservedMetadata = (currentDocument.metadataList || []).filter(
          (m) => !RESERVED_METADATA_KEYS.includes(m.key)
        );
        await updateDocument(registrationNumber, {
          updatedBy: user.username,
          description,
          type,
          metadataList: [
            ...preservedMetadata,
            { key: 'published', value: published ? 'true' : 'false' },
          ],
        });
      }

      for (const documentDataId of pendingDeleteFileIds) {
        await apiService.del(`documents/${registrationNumber}/files/${documentDataId}`);
      }

      for (const file of pendingUploadFiles) {
        const formData = new FormData();
        formData.append('document', JSON.stringify({ updatedBy: user.username }));
        formData.append('documentFile', file);
        await apiService.putFormData(`documents/${registrationNumber}/files`, formData);
      }

      if (!hasDocumentChanges && !hasFileChanges) {
        setEditing(false);
        return;
      }

      await fetchDocument(registrationNumber);
      await loadRevisions();
      setEditing(false);
      setPendingDeleteFileId(null);
      setPendingDeleteFileIds([]);
      setPendingUploadFiles([]);
      toast.success(t('common:document_save_success'));
    } catch {
      toast.error(t('common:document_save_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveResponsibilities = async () => {
    if (!currentDocument) return;

    const ok = (await responsibilitiesRef.current?.flush()) ?? true;
    if (!ok) return;

    setSavingResponsibilities(true);
    try {
      await updateResponsibilities(
        registrationNumber,
        user.username,
        responsibilitiesDraft.map((username) => ({ username }))
      );
      setEditingResponsibilities(false);
      toast.success(t('common:document_responsibilities_save_success'));
    } catch {
      toast.error(t('common:document_responsibilities_save_error'));
    } finally {
      setSavingResponsibilities(false);
    }
  };

  const handleCancelResponsibilities = () => {
    if (currentDocument) {
      setResponsibilitiesDraft(
        (currentDocument.responsibilities || []).map((r) => r.username)
      );
    }
    setEditingResponsibilities(false);
  };

  const handleQuickPublish = async (nextPublished: boolean) => {
    if (!currentDocument) return;
    setPublishing(true);
    try {
      const preservedMetadata = (currentDocument.metadataList || []).filter(
        (m) => !RESERVED_METADATA_KEYS.includes(m.key)
      );
      await updateDocument(registrationNumber, {
        updatedBy: user.username,
        description: currentDocument.description || '',
        type: currentDocument.type,
        metadataList: [
          ...preservedMetadata,
          { key: 'published', value: nextPublished ? 'true' : 'false' },
        ],
      });
      await fetchDocument(registrationNumber);
      await loadRevisions();
      toast.success(
        nextPublished
          ? t('common:document_publish_success')
          : t('common:document_save_success')
      );
    } catch {
      toast.error(t('common:document_save_error'));
    } finally {
      setPublishing(false);
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

  const previewFileId = previewFile?.id;
  const fetchPreviewBlob = useCallback(async () => {
    if (!previewFileId) throw new Error('No preview file');
    const fileUrl =
      selectedRevision !== null
        ? `documents/${registrationNumber}/revisions/${selectedRevision}/files/${previewFileId}`
        : `documents/${registrationNumber}/files/${previewFileId}`;
    const res = await apiService.getBlob(fileUrl);
    return res.data as Blob;
  }, [previewFileId, registrationNumber, selectedRevision]);

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

  const handleStageDeleteFile = (documentDataId: string) => {
    setPendingDeleteFileIds((prev) =>
      prev.includes(documentDataId) ? prev : [...prev, documentDataId]
    );
    setPendingDeleteFileId(null);
  };

  const handleStageUploadFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(e.target.files || []);
    if (nextFiles.length > 0) {
      setPendingUploadFiles((prev) => [...prev, ...nextFiles]);
    }
    e.target.value = '';
  };

  const handleRemoveStagedUploadFile = (index: number) => {
    setPendingUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const copyToClipboard = async (value: string) => {
    if (typeof window === 'undefined') return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(t('common:document_public_link_copied'));
    } catch {
      toast.error(t('common:error_generic'));
    }
  };

  const handleCopyPublicLink = async () => {
    if (typeof window === 'undefined') return;
    await copyToClipboard(`${window.location.origin}/d/${registrationNumber}`);
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
  const publicBasePath =
    selectedRevision !== null
      ? `/d/${registrationNumber}/v/${selectedRevision}`
      : `/d/${registrationNumber}`;
  type LinkTone = 'primary' | 'emerald' | 'slate';
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
  const linkToneChip: Record<LinkTone, string> = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  };
  const linkToneHover: Record<LinkTone, string> = {
    primary: 'hover:border-primary/50',
    emerald: 'hover:border-emerald-500/50',
    slate: 'hover:border-slate-400/60 dark:hover:border-slate-500/50',
  };
  const absolutePublicUrl = (path: string) => (publicOrigin ? `${publicOrigin}${path}` : path);
  const visibleDocumentFiles = (doc.documentData || []).filter(
    (file) => !pendingDeleteFileIds.includes(file.id)
  );

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
    <div className="mx-auto max-w-5xl 2xl:max-w-6xl">
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
                <Button
                  variant="secondary"
                  onClick={() => {
                    resetEditDraft();
                    setEditing(true);
                  }}
                  className="w-full sm:w-auto"
                >
                  <Edit className="mr-2 h-4 w-4" />
                {t('common:document_edit')}
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    resetEditDraft();
                    setEditing(false);
                  }}
                  className="flex-1 sm:flex-none"
                >
                  <X className="mr-2 h-4 w-4" />
                  {t('common:cancel')}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 sm:flex-none"
                >
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

      {isViewingHistorical && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted px-4 py-3">
          <p className="text-sm font-medium">
            {t('common:document_viewing_revision', {
              revision: selectedRevision !== null ? toDisplayRevision(selectedRevision) : null,
            })}
          </p>
          <Button variant="secondary" size="sm" onClick={handleBackToLatest}>
            {t('common:document_back_to_latest')}
          </Button>
        </div>
      )}

      <Tabs defaultValue="details">
        <TabsList variant="line" className="border-b border-border pb-0">
          <TabsTrigger value="details" className="px-3 pb-2.5 pt-1">
            {t('common:details')}
          </TabsTrigger>
          <TabsTrigger value="responsibilities" className="px-3 pb-2.5 pt-1">
            <span className="inline-flex items-center gap-1.5">
              {t('common:document_responsibilities_label')}
              <Badge variant="secondary" className="h-4 px-1.5 font-mono text-[0.65rem]">
                {doc.responsibilities?.length || 0}
              </Badge>
            </span>
          </TabsTrigger>
          <TabsTrigger value="revisions" className="px-3 pb-2.5 pt-1">
            <span className="inline-flex items-center gap-1.5">
              {t('common:document_revisions')}
              <Badge variant="secondary" className="h-4 px-1.5 font-mono text-[0.65rem]">
                {revisions.length}
              </Badge>
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="mt-5 space-y-5">
            <section className="rounded-xl bg-card p-6 shadow-sm">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="min-w-0">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Tag size={11} aria-hidden="true" />
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
                    <p className="truncate text-sm" title={doc.type}>
                      {types.find((t) => t.type === doc.type)?.displayName || doc.type}
                    </p>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <UserCircle size={11} aria-hidden="true" />
                    {t('common:documents_created_by')}
                  </p>
                  <p className="truncate text-sm" title={doc.createdBy}>
                    {displayUsername(doc.createdBy)}
                  </p>
                  {doc.updatedBy && doc.updatedBy !== doc.createdBy && (
                    <p
                      className="mt-1 truncate text-xs text-muted-foreground"
                      title={doc.updatedBy}
                    >
                      {t('common:document_updated_by')}: {displayUsername(doc.updatedBy)}
                    </p>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Building2 size={11} aria-hidden="true" />
                    {t('common:document_department')}
                  </p>
                  <p className="truncate text-sm">
                    {doc.metadataList?.find((m) => m.key === 'departmentOrgName')?.value || '—'}
                  </p>
                </div>
              </div>

              {/* Status strip: archive + published live as inline chips below
                  the primary metadata so the main grid stays clean and the
                  status feels distinct at a glance. */}
              <div
                className="mt-4 flex flex-wrap items-center gap-2"
                role="group"
                aria-label={t('common:document_status_strip_aria')}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('common:document_status_heading')}
                </span>
                {doc.archive ? (
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  >
                    <Archive size={11} className="mr-1" aria-hidden="true" />
                    {t('common:document_archive')}
                  </Badge>
                ) : null}
                {canEdit && editing ? (
                  <div className="flex items-center gap-2 rounded-full border border-border bg-background px-2 py-0.5">
                    <Switch
                      id="document-published"
                      checked={published}
                      onCheckedChange={setPublished}
                    />
                    <Label htmlFor="document-published" className="cursor-pointer text-xs font-medium">
                      {t('common:document_public_status')}
                    </Label>
                  </div>
                ) : published ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  >
                    <Globe size={11} className="mr-1" aria-hidden="true" />
                    {t('common:document_public_status')}
                  </Badge>
                ) : null}
                {!doc.archive && !published && !editing && (
                  <span className="text-xs text-muted-foreground">
                    {t('common:document_status_none')}
                  </span>
                )}
                {published && !editing && (
                  <Button variant="secondary" size="xs" onClick={handleCopyPublicLink}>
                    <Copy className="mr-1 h-3 w-3" />
                    {t('common:document_public_link_copy')}
                  </Button>
                )}
              </div>

              <div className="mt-6 border-t border-border pt-5">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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

            <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <Link2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {t('common:document_public_links')}
                    {published && (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/40 bg-emerald-500/10 text-[0.65rem] text-emerald-700 dark:text-emerald-300"
                      >
                        <Globe size={10} className="mr-1" aria-hidden="true" />
                        {t('common:document_public_status')}
                      </Badge>
                    )}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {published
                      ? t('common:document_public_links_description')
                      : t('common:document_public_links_enable_hint')}
                  </p>
                </div>
                {published && canEdit && !editing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuickPublish(false)}
                    disabled={publishing}
                    aria-label={t('common:document_unpublish_action')}
                    title={t('common:document_unpublish_action')}
                    className={cn(
                      'shrink-0 min-h-11 sm:min-h-8 text-muted-foreground',
                      'hover:bg-muted hover:text-foreground',
                      'focus-visible:bg-muted focus-visible:text-foreground',
                      'active:scale-[0.97]'
                    )}
                  >
                    {publishing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : null}
                    <span className={publishing ? 'ml-2' : ''}>
                      {t('common:document_unpublish_action')}
                    </span>
                  </Button>
                )}
              </div>
              {published ? (
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
              ) : (
                <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
                  <div
                    className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary ring-4 ring-primary/5"
                    aria-hidden="true"
                  >
                    <Link2 size={20} />
                  </div>
                  <div className="max-w-sm">
                    <p className="text-sm font-medium text-foreground">
                      {t('common:document_public_links_unpublished')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('common:document_public_links_enable_hint')}
                    </p>
                  </div>
                  {canEdit && !editing && (
                    <Button
                      type="button"
                      onClick={() => handleQuickPublish(true)}
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
                </div>
              )}
            </section>

            <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <FileTextIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  {t('common:document_files')}
                  <Badge variant="secondary" className="h-5 px-1.5 font-mono text-[0.7rem]">
                    {editing ? visibleDocumentFiles.length + pendingUploadFiles.length : doc.documentData?.length || 0}
                  </Badge>
                </h3>
                {canEdit && editing && (
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
                      multiple
                      className="hidden"
                      onChange={handleStageUploadFiles}
                      aria-label={t('common:document_files_upload')}
                    />
                  </div>
                )}
              </div>
              {visibleDocumentFiles.length === 0 && pendingUploadFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('common:document_files_empty')}</p>
              ) : (
                <ul className="space-y-2">
                  {visibleDocumentFiles.map((file) => (
                    <li
                      key={file.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3 transition-[background-color,border-color] hover:border-primary/30 hover:bg-accent"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium" title={file.fileName}>
                          {file.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span>{file.mimeType}</span>
                          <span aria-hidden="true"> · </span>
                          <span className="tabular-nums">{formatFileSize(file.fileSizeInBytes)}</span>
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {supportsPreview(file.mimeType, file.fileName) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${t('common:document_files_preview')}: ${file.fileName}`}
                            onClick={() =>
                              setPreviewFile({
                                id: file.id,
                                fileName: file.fileName,
                                mimeType: file.mimeType,
                              })
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`${t('common:document_files_download')}: ${file.fileName}`}
                          onClick={() => handleDownload(file.id, file.fileName)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {canEdit && editing && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${t('common:document_files_delete')}: ${file.fileName}`}
                            onClick={() => setPendingDeleteFileId(file.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                  {editing &&
                    pendingUploadFiles.map((file, index) => (
                      <li
                        key={`staged-${file.name}-${index}`}
                        className="flex items-center justify-between rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <span className="tabular-nums">{formatFileSize(file.size)}</span>
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${t('common:documents_filter_chip_remove', {
                              label: file.name,
                            })}`}
                            onClick={() => handleRemoveStagedUploadFile(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </section>
          </div>
        </TabsContent>

        <TabsContent value="responsibilities">
          <div className="mt-5">
            <section className="rounded-xl bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <UserCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {t('common:document_responsibilities_label')}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('common:document_responsibilities_description')}
                  </p>
                </div>
                {canEdit && !editingResponsibilities && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditingResponsibilities(true)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    {t('common:document_responsibilities_edit')}
                  </Button>
                )}
              </div>

              {editingResponsibilities ? (
                <div className="space-y-3">
                  <ResponsibilitiesInput
                    ref={responsibilitiesRef}
                    value={responsibilitiesDraft}
                    onChange={setResponsibilitiesDraft}
                    validateUser
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelResponsibilities}
                      disabled={savingResponsibilities}
                    >
                      <X className="mr-1.5 h-4 w-4" />
                      {t('common:cancel')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveResponsibilities}
                      disabled={savingResponsibilities}
                    >
                      {savingResponsibilities ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-1.5 h-4 w-4" />
                      )}
                      {t('common:document_responsibilities_save')}
                    </Button>
                  </div>
                </div>
              ) : doc.responsibilities && doc.responsibilities.length > 0 ? (
                <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {doc.responsibilities.map((r) => (
                    <li key={r.username}>
                      <ResponsibilityCard username={r.username} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('common:document_responsibilities_empty')}
                </p>
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
            ) : revisions.length === 1 ? (
              <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                  aria-hidden="true"
                >
                  <History size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {t('common:documents_revisions_only_one')}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('common:documents_revisions_only_one_hint')}
                  </p>
                  <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('common:documents_created')}
                      </dt>
                      <dd className="mt-0.5 tabular-nums text-foreground">
                        {dayjs(revisions[0].created).format('YYYY-MM-DD HH:mm')}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('common:documents_created_by')}
                      </dt>
                      <dd className="mt-0.5 text-foreground">
                        {displayUsername(revisions[0].createdBy)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('common:document_revision')}
                      </dt>
                      <dd className="mt-0.5 font-mono text-foreground">
                        {toDisplayRevision(revisions[0].revision)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <History className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  <Badge variant="secondary" className="h-5 px-1.5 font-mono text-[0.7rem]">
                    {revisions.length === 1
                      ? t('common:documents_revisions_count_one', { count: revisions.length })
                      : t('common:documents_revisions_count', { count: revisions.length })}
                  </Badge>
                </div>
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                  <table
                    className="w-full"
                    aria-label={`${t('common:document_revisions')} – ${doc.registrationNumber}`}
                  >
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
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
                            onClick={() => handleSelectRevision(rev.revision)}
                            className={cn(
                              'group relative cursor-pointer border-b border-border transition-colors last:border-0',
                              'hover:bg-accent focus-within:bg-accent',
                              'focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring',
                              isActive && 'bg-primary/5'
                            )}
                          >
                            <td
                              className={cn(
                                'relative px-4 py-3.5 text-sm font-semibold',
                                isActive &&
                                  "before:absolute before:left-0 before:top-1/2 before:h-6 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-primary"
                              )}
                            >
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleSelectRevision(rev.revision);
                                }}
                                className="relative inline-flex items-center gap-2 rounded-sm text-left outline-none after:absolute after:inset-0 after:cursor-pointer after:content-[''] focus-visible:outline-none"
                                aria-label={t('common:document_viewing_revision', {
                                  revision: toDisplayRevision(rev.revision),
                                })}
                              >
                                <span className="tabular-nums">
                                  {toDisplayRevision(rev.revision)}
                                </span>
                                {isLatest && (
                                  <Badge
                                    variant="outline"
                                    className="h-4 border-primary/30 px-1.5 text-[0.65rem] text-primary"
                                  >
                                    {t('common:revision_latest')}
                                  </Badge>
                                )}
                                {isFirst && (
                                  <Badge
                                    variant="outline"
                                    className="h-4 px-1.5 text-[0.65rem] text-muted-foreground"
                                  >
                                    {t('common:revision_first')}
                                  </Badge>
                                )}
                                {isActive && !isLatest && (
                                  <Badge variant="outline" className="h-4 px-1.5 text-[0.65rem]">
                                    {t('common:documents_revisions_current')}
                                  </Badge>
                                )}
                              </button>
                            </td>
                            <td className="px-4 py-3.5 text-sm text-muted-foreground tabular-nums">
                              {dayjs(rev.created).format('YYYY-MM-DD HH:mm')}
                            </td>
                            <td className="hidden px-4 py-3.5 text-sm sm:table-cell">
                              {displayUsername(rev.createdBy)}
                            </td>
                            <td className="hidden px-4 py-3.5 text-sm md:table-cell">
                              {rev.description?.slice(0, 60)}
                              {rev.description && rev.description.length > 60 ? '…' : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={pendingDeleteFileId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteFileId(null);
        }}
        title={t('common:document_files_delete_confirm')}
        description={t('common:document_files_delete_confirm')}
        confirmLabel={t('common:delete')}
        cancelLabel={t('common:cancel')}
        variant="destructive"
        onConfirm={() => {
          if (pendingDeleteFileId) handleStageDeleteFile(pendingDeleteFileId);
        }}
      />

      <Dialog
        open={previewFile !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewFile(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-6xl gap-4 overflow-hidden sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle className="truncate" title={previewFile?.fileName}>
              {previewFile?.fileName}
            </DialogTitle>
            <DialogDescription className="truncate">
              {previewFile?.mimeType}
            </DialogDescription>
          </DialogHeader>
          {previewFile && (
            <FilePreview
              key={previewFile.id}
              fileName={previewFile.fileName}
              mimeType={previewFile.mimeType}
              fetchBlob={fetchPreviewBlob}
              labels={{
                loading: t('common:document_files_preview_loading'),
                error: t('common:document_files_preview_error'),
                unsupported: t('common:document_files_preview_unsupported'),
                pptxFidelityWarning: t('common:document_files_preview_pptx_warning'),
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentDetailPage;
