'use client';

import type {} from 'react/canary';

import { useCallback, useEffect, useState, useRef, ViewTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@components/ui/button';
import { Textarea } from '@components/ui/textarea';
import { Input } from '@components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@components/ui/table';
import { ClickableRow, RowLink } from '@components/data-table/clickable-row';
import {
  DocumentColumnsCells,
  DocumentColumnsHeader,
  type DocumentColumnKey,
} from '@components/document-list/document-columns';
import { ConfirmDialog } from '@components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@components/ui/dialog';
import dynamic from 'next/dynamic';

const FilePreview = dynamic(() => import('@components/file-preview/file-preview'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
    </div>
  ),
});
import {
  ArrowLeft,
  Download,
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
  CalendarClock,
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
  PagedDocumentResponseDto,
} from '@data-contracts/backend/data-contracts';
import { DocumentStatusEnum } from '@data-contracts/backend/data-contracts';
import { DocumentStatusBadge } from '@components/document-status/document-status-badge';
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

// dayjs inputs for date-only values round-trip best through YYYY-MM-DD.
const toDateInputValue = (value: string | undefined): string =>
  value ? dayjs(value).format('YYYY-MM-DD') : '';

const formatDateDisplay = (value: string | undefined, fallback: string) =>
  value ? dayjs(value).format('YYYY-MM-DD') : fallback;

const DETAIL_REVISION_COLUMNS: readonly DocumentColumnKey[] = [
  'description',
  'type',
  'validity',
  'responsibilities',
  'department',
];

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
    publishDocument,
    revokeDocument,
    unrevokeDocument,
    updateResponsibilities,
  } = useDocumentStore();
  const { types, fetchTypes, getDisplayName } = useDocumentTypeStore();
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
  const [validFromDraft, setValidFromDraft] = useState('');
  const [validToDraft, setValidToDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [pendingRevokeConfirm, setPendingRevokeConfirm] = useState(false);
  const [unrevoking, setUnrevoking] = useState(false);
  const [pendingUnrevokeConfirm, setPendingUnrevokeConfirm] = useState(false);
  const [revisions, setRevisions] = useState<DocType[]>([]);
  const [pendingDeleteFileId, setPendingDeleteFileId] = useState<string | null>(null);
  const [pendingDeleteFileIds, setPendingDeleteFileIds] = useState<string[]>([]);
  const [pendingRevertConfirm, setPendingRevertConfirm] = useState(false);
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
      setValidFromDraft(toDateInputValue(currentDocument.validFrom));
      setValidToDraft(toDateInputValue(currentDocument.validTo));
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
    setValidFromDraft(toDateInputValue(currentDocument.validFrom));
    setValidToDraft(toDateInputValue(currentDocument.validTo));
    setPendingDeleteFileId(null);
    setPendingDeleteFileIds([]);
    setPendingUploadFiles([]);
  }, [currentDocument]);

  const loadRevisions = useCallback(async (): Promise<DocType[]> => {
    try {
      const res = await apiService.get<ApiResponse<PagedDocumentResponseDto>>(
        `documents/${registrationNumber}/revisions?size=50&sort=revision,desc`
      );
      const list = res.data.data.documents || [];
      setRevisions(list);
      return list;
    } catch {
      return [];
    }
  }, [registrationNumber]);

  useEffect(() => {
    loadRevisions();
  }, [loadRevisions]);

  const handleSave = async () => {
    if (!currentDocument) return;
    setSaving(true);
    try {
      const currentValidFrom = toDateInputValue(currentDocument.validFrom);
      const currentValidTo = toDateInputValue(currentDocument.validTo);
      const hasDocumentChanges =
        description !== (currentDocument.description || '') ||
        type !== (currentDocument.type || '') ||
        validFromDraft !== currentValidFrom ||
        validToDraft !== currentValidTo;
      const hasFileChanges = pendingDeleteFileIds.length > 0 || pendingUploadFiles.length > 0;

      if (hasDocumentChanges) {
        await updateDocument(registrationNumber, {
          updatedBy: user.username,
          description,
          type,
          validFrom: validFromDraft || undefined,
          validTo: validToDraft || undefined,
        });
      }

      if (pendingDeleteFileIds.length > 0) {
        await Promise.all(
          pendingDeleteFileIds.map((documentDataId) =>
            apiService.del(`documents/${registrationNumber}/files/${documentDataId}`)
          )
        );
      }

      if (pendingUploadFiles.length > 0) {
        await Promise.all(
          pendingUploadFiles.map((file) => {
            const formData = new FormData();
            formData.append('document', JSON.stringify({ updatedBy: user.username }));
            formData.append('documentFile', file);
            return apiService.putFormData(`documents/${registrationNumber}/files`, formData);
          })
        );
      }

      if (!hasDocumentChanges && !hasFileChanges) {
        setEditing(false);
        return;
      }

      // A successful save always creates a new revision upstream. If we were
      // viewing a pinned revision via ?revision=N, drop the query so the URL
      // reflects the new latest — otherwise the page would re-render onto the
      // stale revision and look like the save did nothing.
      if (selectedRevision !== null) {
        router.replace(`/${locale}/documents/${registrationNumber}`, { scroll: false });
      }
      // One revisions fetch covers both concerns: it refreshes the
      // revisions tab state and gives us the new latest to push into the
      // store. fetchDocument's own /revisions?size=1 would have been a
      // second round-trip for the same information.
      const list = await loadRevisions();
      if (selectedRevision === null && list[0]) {
        useDocumentStore.setState({ currentDocument: list[0] });
      }
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

    if (responsibilitiesDraft.length === 0) {
      // Documents must always have an owner on file, so block the save
      // rather than letting the upstream PUT strip the last responsibility.
      toast.error(t('common:document_responsibilities_required'));
      return;
    }

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

  const handleActivate = async () => {
    if (!currentDocument) return;
    setPublishing(true);
    try {
      // Dedicated upstream action — the UI never sets status directly.
      // Upstream takes the DRAFT to ACTIVE (or SCHEDULED if validFrom is in
      // the future) and computes EXPIRED automatically once validTo passes.
      await publishDocument(registrationNumber, user.username);
      if (selectedRevision !== null) {
        router.replace(`/${locale}/documents/${registrationNumber}`, { scroll: false });
      }
      await loadRevisions();
      toast.success(t('common:document_publish_success'));
    } catch {
      toast.error(t('common:document_save_error'));
    } finally {
      setPublishing(false);
    }
  };

  const handleRevoke = async () => {
    if (!currentDocument) return;
    setRevoking(true);
    try {
      // Dedicated upstream action mirrors publish: ACTIVE → REVOKED in-place,
      // no new revision. The public link falls back to the previous ACTIVE
      // revision automatically via fetchLatestPublicDocument's scan.
      await revokeDocument(registrationNumber, user.username);
      if (selectedRevision !== null) {
        router.replace(`/${locale}/documents/${registrationNumber}`, { scroll: false });
      }
      await loadRevisions();
      toast.success(t('common:document_revoke_success'));
    } catch {
      toast.error(t('common:document_save_error'));
    } finally {
      setRevoking(false);
    }
  };

  const handleUnrevoke = async () => {
    if (!currentDocument) return;
    setUnrevoking(true);
    try {
      // Upstream reuses the publish status resolver — REVOKED goes straight
      // back to ACTIVE (or SCHEDULED if validFrom is still in the future).
      // A 409 means validTo has passed and the document can no longer be
      // re-activated without extending its validity window first.
      await unrevokeDocument(registrationNumber, user.username);
      if (selectedRevision !== null) {
        router.replace(`/${locale}/documents/${registrationNumber}`, { scroll: false });
      }
      await loadRevisions();
      toast.success(t('common:document_unrevoke_success'));
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast.error(t('common:document_unrevoke_expired_error'));
      } else {
        toast.error(t('common:document_save_error'));
      }
    } finally {
      setUnrevoking(false);
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
  const isActive = doc.status === DocumentStatusEnum.ACTIVE;
  const activeRevision = selectedRevision ?? doc.revision;

  // Public-links section is driven by lifecycle status — each non-ACTIVE
  // state needs a different empty-state message (and only DRAFT should
  // offer the Publish button).
  type PublicLinksState =
    | { mode: 'active' }
    | { mode: 'info'; title: string; hint: string; showPublishButton: boolean };
  const publicLinksState: PublicLinksState = (() => {
    if (isActive) return { mode: 'active' };
    if (doc.status === DocumentStatusEnum.SCHEDULED) {
      const date = formatDateDisplay(doc.validFrom, '');
      return {
        mode: 'info',
        title: t('common:document_public_links_scheduled_title'),
        hint: date
          ? t('common:document_public_links_scheduled_hint', { date })
          : t('common:document_public_links_scheduled_hint_undated'),
        showPublishButton: false,
      };
    }
    if (doc.status === DocumentStatusEnum.EXPIRED) {
      const date = formatDateDisplay(doc.validTo, '');
      return {
        mode: 'info',
        title: t('common:document_public_links_expired_title'),
        hint: date
          ? t('common:document_public_links_expired_hint', { date })
          : t('common:document_public_links_expired_hint_undated'),
        showPublishButton: false,
      };
    }
    if (doc.status === DocumentStatusEnum.REVOKED) {
      return {
        mode: 'info',
        title: t('common:document_public_links_revoked_title'),
        hint: t('common:document_public_links_revoked_hint'),
        showPublishButton: false,
      };
    }
    // DRAFT (or unknown) — the only state with a Publish action.
    return {
      mode: 'info',
      title: t('common:document_public_links_unpublished'),
      hint: t('common:document_public_links_enable_hint'),
      showPublishButton: true,
    };
  })();
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
    emerald: 'bg-chart-2/10 text-chart-2',
    slate: 'bg-muted text-muted-foreground',
  };
  const linkToneHover: Record<LinkTone, string> = {
    primary: 'hover:border-primary/50',
    emerald: 'hover:border-chart-2/50',
    slate: 'hover:border-border/80',
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
                  onClick={() => {
                    // Upstream demotes any PATCH to DRAFT, so warn before
                    // silently dropping a published/scheduled revision out
                    // of the list. DRAFT -> DRAFT is a no-op lifecycle
                    // change and saves immediately.
                    if (
                      currentDocument?.status &&
                      currentDocument.status !== DocumentStatusEnum.DRAFT
                    ) {
                      setPendingRevertConfirm(true);
                    } else {
                      handleSave();
                    }
                  }}
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

              {/* Status strip: lifecycle status + archive badge. Status is
                  read-only from the UI — it's derived upstream from the
                  validity window and review workflows. */}
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
                  <Badge
                    variant="outline"
                    className="border-chart-3/40 bg-chart-3/10 text-chart-3"
                  >
                    <Archive size={11} className="mr-1" aria-hidden="true" />
                    {t('common:document_archive')}
                  </Badge>
                )}
                {isActive && !editing && (
                  <Button variant="secondary" size="xs" onClick={handleCopyPublicLink}>
                    <Copy className="mr-1 h-3 w-3" />
                    {t('common:document_public_link_copy')}
                  </Button>
                )}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
                <div className="min-w-0">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <CalendarClock size={11} aria-hidden="true" />
                    {t('common:documents_created')}
                  </p>
                  <p className="text-sm tabular-nums">
                    {dayjs(doc.created).format('YYYY-MM-DD HH:mm')}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <CalendarClock size={11} aria-hidden="true" />
                    {t('common:document_valid_from')}
                  </p>
                  {canEdit && editing ? (
                    <Input
                      type="date"
                      value={validFromDraft}
                      onChange={(e) => setValidFromDraft(e.target.value)}
                      aria-label={t('common:document_valid_from')}
                    />
                  ) : (
                    <p className="text-sm tabular-nums text-muted-foreground">
                      {formatDateDisplay(doc.validFrom, t('common:document_valid_not_set'))}
                    </p>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <CalendarClock size={11} aria-hidden="true" />
                    {t('common:document_valid_to')}
                  </p>
                  {canEdit && editing ? (
                    <Input
                      type="date"
                      value={validToDraft}
                      onChange={(e) => setValidToDraft(e.target.value)}
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
                {isActive && canEdit && !editing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPendingRevokeConfirm(true)}
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
                      {publicLinksState.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {publicLinksState.hint}
                    </p>
                  </div>
                  {publicLinksState.showPublishButton && canEdit && !editing && (
                    <Button
                      type="button"
                      onClick={handleActivate}
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
                  {doc.status === DocumentStatusEnum.REVOKED && canEdit && !editing && (
                    <Button
                      type="button"
                      onClick={() => setPendingUnrevokeConfirm(true)}
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
                  {visibleDocumentFiles.map((file) => {
                    const canPreview = supportsPreview(file.mimeType, file.fileName);
                    const primaryActionLabel = canPreview
                      ? `${t('common:document_files_preview')}: ${file.fileName}`
                      : `${t('common:document_files_download')}: ${file.fileName}`;
                    const handlePrimary = () => {
                      if (canPreview) {
                        setPreviewFile({
                          id: file.id,
                          fileName: file.fileName,
                          mimeType: file.mimeType,
                        });
                      } else {
                        handleDownload(file.id, file.fileName);
                      }
                    };
                    return (
                      <li
                        key={file.id}
                        className="group relative flex items-center gap-2 rounded-lg border border-border p-3 transition-[background-color,border-color] hover:border-primary/30 hover:bg-accent focus-within:border-primary/40 focus-within:ring-[3px] focus-within:ring-ring/40"
                      >
                        <button
                          type="button"
                          onClick={handlePrimary}
                          aria-label={primaryActionLabel}
                          className="relative min-w-0 flex-1 text-left outline-none after:absolute after:inset-0 after:cursor-pointer after:rounded-lg after:content-[''] focus-visible:outline-none"
                        >
                          <p className="truncate text-sm font-medium" title={file.fileName}>
                            {file.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <span>{file.mimeType}</span>
                            <span aria-hidden="true"> · </span>
                            <span className="tabular-nums">
                              {formatFileSize(file.fileSizeInBytes)}
                            </span>
                          </p>
                        </button>
                        <div className="relative z-10 flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${t('common:document_files_download')}: ${file.fileName}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDownload(file.id, file.fileName);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {canEdit && editing && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`${t('common:document_files_delete')}: ${file.fileName}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setPendingDeleteFileId(file.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
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
                    renderItem={(username, onRemove) => (
                      <ResponsibilityCard username={username} onRemove={onRemove} />
                    )}
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
                  <Table
                    aria-label={`${t('common:document_revisions')} – ${doc.registrationNumber}`}
                  >
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead
                          scope="col"
                          className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                          {t('common:document_revision')}
                        </TableHead>
                        <DocumentColumnsHeader columns={DETAIL_REVISION_COLUMNS} />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {revisions.map((rev) => {
                        const isActive = activeRevision === rev.revision;
                        const isLatest = rev.revision === latestRevisionNumber;
                        const isFirst =
                          revisions.length > 1 &&
                          rev.revision === firstRevisionNumber &&
                          rev.revision !== latestRevisionNumber;
                        const href = isLatest
                          ? `/${locale}/documents/${registrationNumber}`
                          : `/${locale}/documents/${registrationNumber}?revision=${rev.revision}`;
                        return (
                          <ClickableRow
                            key={rev.revision}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(isActive && 'bg-primary/5')}
                          >
                            <TableCell
                              className={cn(
                                'px-4 py-3.5 text-sm font-semibold',
                                isActive && 'text-primary'
                              )}
                            >
                              <RowLink
                                href={href}
                                ariaLabel={t('common:document_viewing_revision', {
                                  revision: toDisplayRevision(rev.revision),
                                })}
                                className="gap-2"
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
                              </RowLink>
                            </TableCell>
                            <DocumentColumnsCells
                              document={rev}
                              columns={DETAIL_REVISION_COLUMNS}
                              getTypeName={getDisplayName}
                            />
                          </ClickableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
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

      <ConfirmDialog
        open={pendingRevertConfirm}
        onOpenChange={(open) => {
          if (!open) setPendingRevertConfirm(false);
        }}
        title={t('common:document_save_revert_title')}
        description={t('common:document_save_revert_description')}
        confirmLabel={t('common:document_save_revert_confirm')}
        cancelLabel={t('common:cancel')}
        onConfirm={() => {
          setPendingRevertConfirm(false);
          handleSave();
        }}
      />

      <ConfirmDialog
        open={pendingRevokeConfirm}
        onOpenChange={(open) => {
          if (!open) setPendingRevokeConfirm(false);
        }}
        title={t('common:document_revoke_confirm_title')}
        description={t('common:document_revoke_confirm_description')}
        confirmLabel={t('common:document_revoke_confirm')}
        cancelLabel={t('common:cancel')}
        variant="destructive"
        onConfirm={() => {
          setPendingRevokeConfirm(false);
          handleRevoke();
        }}
      />

      <ConfirmDialog
        open={pendingUnrevokeConfirm}
        onOpenChange={(open) => {
          if (!open) setPendingUnrevokeConfirm(false);
        }}
        title={t('common:document_unrevoke_confirm_title')}
        description={t('common:document_unrevoke_confirm_description')}
        confirmLabel={t('common:document_unrevoke_confirm')}
        cancelLabel={t('common:cancel')}
        onConfirm={() => {
          setPendingUnrevokeConfirm(false);
          handleUnrevoke();
        }}
      />

      <Dialog
        open={previewFile !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewFile(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-6xl gap-4 overflow-hidden sm:max-w-6xl">
          <DialogHeader className="pr-10">
            <div className="flex flex-wrap items-start justify-between gap-2 sm:flex-nowrap">
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate" title={previewFile?.fileName}>
                  {previewFile?.fileName}
                </DialogTitle>
                <DialogDescription className="truncate">
                  {previewFile?.mimeType}
                </DialogDescription>
              </div>
              {previewFile && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => handleDownload(previewFile.id, previewFile.fileName)}
                >
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('common:document_files_download')}
                </Button>
              )}
            </div>
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
