'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@components/ui/button';
import { ConfirmDialog } from '@components/ui/confirm-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { Badge } from '@components/ui/badge';
import { useDocumentStore } from '@stores/document-store';
import { useDocumentTypeStore } from '@stores/document-type-store';
import { useUserStore } from '@stores/user-store';
import { apiService } from '@services/api-service';
import { useViewTransitionNav } from '@components/motion/directional-transition';
import { DocumentStatusEnum } from '@data-contracts/backend/data-contracts';
import { toDisplayRevision } from '@utils/document-revision';
import { DocumentDetailProvider } from '@components/document-detail/document-detail-context';
import { DocumentHeaderBar } from '@components/document-detail/document-header-bar';
import { DocumentDetailsCard } from '@components/document-detail/document-details-card';
import { PublicLinksSection } from '@components/document-detail/public-links-section';
import { DocumentFilesSection } from '@components/document-detail/document-files-section';
import { ResponsibilitiesTab } from '@components/document-detail/responsibilities-tab';
import { RevisionsTab } from '@components/document-detail/revisions-tab';
import {
  DocumentPreviewDialog,
  type PreviewTarget,
} from '@components/document-detail/document-preview-dialog';
import { useDocumentEditDraft } from '@components/document-detail/use-document-edit-draft';
import { useDocumentRevisions } from '@components/document-detail/use-document-revisions';
import { useLifecycleAction } from '@components/document-detail/use-lifecycle-action';

const DocumentDetailPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params?.locale as string;
  const registrationNumber = params?.registrationNumber as string;
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

  const revisionParam = searchParams.get('revision');
  const parsedRevision = revisionParam !== null ? Number(revisionParam) : null;
  const selectedRevision =
    parsedRevision !== null && Number.isInteger(parsedRevision) && parsedRevision >= 0
      ? parsedRevision
      : null;

  const editDraft = useDocumentEditDraft(currentDocument);
  const { revisions, latestRevisionNumber, firstRevisionNumber, reload: reloadRevisions } =
    useDocumentRevisions(registrationNumber);

  const [saving, setSaving] = useState(false);
  const [pendingRevertConfirm, setPendingRevertConfirm] = useState(false);
  const [pendingRevokeConfirm, setPendingRevokeConfirm] = useState(false);
  const [pendingUnrevokeConfirm, setPendingUnrevokeConfirm] = useState(false);
  const [previewFile, setPreviewFile] = useState<PreviewTarget | null>(null);
  const [publicOrigin, setPublicOrigin] = useState('');

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

  // A successful lifecycle action always creates or replaces a revision
  // upstream. If the user was viewing a pinned revision via ?revision=N,
  // drop the query so the URL reflects the new latest — otherwise the page
  // re-renders onto the stale revision and looks like nothing happened.
  const clearPinnedRevision = useCallback(() => {
    if (selectedRevision !== null) {
      router.replace(`/${locale}/documents/${registrationNumber}`, { scroll: false });
    }
  }, [selectedRevision, router, locale, registrationNumber]);

  const handleBackToList = useCallback(() => {
    navigate(`/${locale}/documents`, 'nav-back');
  }, [navigate, locale]);

  const handleBackToLatest = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('revision');
    const query = nextParams.toString();
    router.push(`/${locale}/documents/${registrationNumber}${query ? `?${query}` : ''}`, {
      scroll: false,
    });
  }, [searchParams, router, locale, registrationNumber]);

  const handleDownload = useCallback(
    async (documentDataId: string, fileName: string) => {
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
    },
    [registrationNumber, selectedRevision, t]
  );

  const copyToClipboard = useCallback(
    async (value: string) => {
      if (typeof window === 'undefined') return;
      try {
        await navigator.clipboard.writeText(value);
        toast.success(t('common:document_public_link_copied'));
      } catch {
        toast.error(t('common:error_generic'));
      }
    },
    [t]
  );

  const handleCopyPublicLink = useCallback(() => {
    if (typeof window === 'undefined') return;
    copyToClipboard(`${window.location.origin}/d/${registrationNumber}`);
  }, [copyToClipboard, registrationNumber]);

  const handleSave = async () => {
    if (!currentDocument) return;
    setSaving(true);
    try {
      const { draft, hasDocumentChanges, hasFileChanges, finishEditing } = editDraft;
      const documentChanged = hasDocumentChanges(currentDocument);
      const fileChanged = hasFileChanges();

      if (documentChanged) {
        await updateDocument(registrationNumber, {
          updatedBy: user.username,
          description: draft.description,
          type: draft.type,
          validFrom: draft.validFrom || undefined,
          validTo: draft.validTo || undefined,
        });
      }

      if (draft.pendingDeleteFileIds.length > 0) {
        await Promise.all(
          draft.pendingDeleteFileIds.map((id) =>
            apiService.del(`documents/${registrationNumber}/files/${id}`)
          )
        );
      }

      if (draft.pendingUploadFiles.length > 0) {
        await Promise.all(
          draft.pendingUploadFiles.map((file) => {
            const formData = new FormData();
            formData.append('document', JSON.stringify({ updatedBy: user.username }));
            formData.append('documentFile', file);
            return apiService.putFormData(`documents/${registrationNumber}/files`, formData);
          })
        );
      }

      if (!documentChanged && !fileChanged) {
        finishEditing();
        return;
      }

      clearPinnedRevision();
      // One revisions fetch covers both concerns: it refreshes the revisions
      // tab state and gives us the new latest to push into the store.
      // fetchDocument's own /revisions?size=1 would have been a second
      // round-trip for the same information.
      const list = await reloadRevisions();
      if (selectedRevision === null && list[0]) {
        useDocumentStore.setState({ currentDocument: list[0] });
      }
      finishEditing();
      toast.success(t('common:document_save_success'));
    } catch {
      toast.error(t('common:document_save_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveResponsibilities = async (usernames: string[]) => {
    try {
      await updateResponsibilities(
        registrationNumber,
        user.username,
        usernames.map((username) => ({ username }))
      );
      toast.success(t('common:document_responsibilities_save_success'));
      return true;
    } catch {
      toast.error(t('common:document_responsibilities_save_error'));
      return false;
    }
  };

  const resolveGenericError = useCallback(() => t('common:document_save_error'), [t]);

  const publish = useLifecycleAction({
    // Dedicated upstream action — the UI never sets status directly.
    // Upstream takes the DRAFT to ACTIVE (or SCHEDULED if validFrom is in
    // the future) and computes EXPIRED automatically once validTo passes.
    action: useCallback(
      () => publishDocument(registrationNumber, user.username),
      [publishDocument, registrationNumber, user.username]
    ),
    onSuccess: useCallback(async () => {
      clearPinnedRevision();
      await reloadRevisions();
    }, [clearPinnedRevision, reloadRevisions]),
    successMessage: t('common:document_publish_success'),
    resolveErrorMessage: resolveGenericError,
  });

  const revoke = useLifecycleAction({
    // Dedicated upstream action mirrors publish: ACTIVE → REVOKED in-place,
    // no new revision. The public link falls back to the previous ACTIVE
    // revision automatically via fetchLatestPublicDocument's scan.
    action: useCallback(
      () => revokeDocument(registrationNumber, user.username),
      [revokeDocument, registrationNumber, user.username]
    ),
    onSuccess: useCallback(async () => {
      clearPinnedRevision();
      await reloadRevisions();
    }, [clearPinnedRevision, reloadRevisions]),
    successMessage: t('common:document_revoke_success'),
    resolveErrorMessage: resolveGenericError,
  });

  const unrevoke = useLifecycleAction({
    // Upstream reuses the publish status resolver — REVOKED goes straight
    // back to ACTIVE (or SCHEDULED if validFrom is still in the future).
    // A 409 means validTo has passed and the document can no longer be
    // re-activated without extending its validity window first.
    action: useCallback(
      () => unrevokeDocument(registrationNumber, user.username),
      [unrevokeDocument, registrationNumber, user.username]
    ),
    onSuccess: useCallback(async () => {
      clearPinnedRevision();
      await reloadRevisions();
    }, [clearPinnedRevision, reloadRevisions]),
    successMessage: t('common:document_unrevoke_success'),
    resolveErrorMessage: useCallback(
      (error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        return status === 409
          ? t('common:document_unrevoke_expired_error')
          : t('common:document_save_error');
      },
      [t]
    ),
  });

  const handleRequestSave = () => {
    // Upstream demotes any PATCH to DRAFT, so warn before silently dropping
    // a published/scheduled revision out of the list. DRAFT -> DRAFT is a
    // no-op lifecycle change and saves immediately.
    if (currentDocument?.status && currentDocument.status !== DocumentStatusEnum.DRAFT) {
      setPendingRevertConfirm(true);
    } else {
      handleSave();
    }
  };

  const isActive = currentDocument?.status === DocumentStatusEnum.ACTIVE;
  const activeRevision = selectedRevision ?? currentDocument?.revision ?? 0;
  const isViewingHistorical =
    selectedRevision !== null &&
    latestRevisionNumber !== null &&
    selectedRevision !== latestRevisionNumber;
  const canEdit = !isViewingHistorical;
  const showLatestPill =
    !!currentDocument &&
    revisions.length > 1 &&
    latestRevisionNumber !== null &&
    currentDocument.revision === latestRevisionNumber;
  const showFirstPill =
    !!currentDocument &&
    revisions.length > 1 &&
    firstRevisionNumber !== null &&
    currentDocument.revision === firstRevisionNumber &&
    currentDocument.revision !== latestRevisionNumber;

  const contextValue = useMemo(
    () =>
      currentDocument
        ? {
            doc: currentDocument,
            locale,
            registrationNumber,
            selectedRevision,
            canEdit,
            isActive,
            editDraft,
          }
        : null,
    [currentDocument, locale, registrationNumber, selectedRevision, canEdit, isActive, editDraft]
  );

  if (currentDocumentLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentDocument || !contextValue) {
    return <p className="py-8 text-sm text-muted-foreground">{t('common:error_generic')}</p>;
  }

  return (
    <DocumentDetailProvider value={contextValue}>
      <div className="mx-auto max-w-5xl 2xl:max-w-6xl">
        <DocumentHeaderBar
          saving={saving}
          showLatestPill={showLatestPill}
          showFirstPill={showFirstPill}
          onBack={handleBackToList}
          onRequestSave={handleRequestSave}
        />

        {isViewingHistorical && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted px-4 py-3">
            <p className="text-sm font-medium">
              {t('common:document_viewing_revision', {
                revision:
                  selectedRevision !== null ? toDisplayRevision(selectedRevision) : null,
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
                  {currentDocument.responsibilities?.length || 0}
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
              <DocumentDetailsCard types={types} onCopyPublicLink={handleCopyPublicLink} />

              <PublicLinksSection
                publicOrigin={publicOrigin}
                publishing={publish.loading}
                revoking={revoke.loading}
                unrevoking={unrevoke.loading}
                onPublish={publish.run}
                onRequestRevoke={() => setPendingRevokeConfirm(true)}
                onRequestUnrevoke={() => setPendingUnrevokeConfirm(true)}
              />

              <DocumentFilesSection
                onDownload={handleDownload}
                onPreview={(file) =>
                  setPreviewFile({
                    id: file.id,
                    fileName: file.fileName,
                    mimeType: file.mimeType,
                  })
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="responsibilities">
            <ResponsibilitiesTab onSave={handleSaveResponsibilities} />
          </TabsContent>

          <TabsContent value="revisions">
            <RevisionsTab
              revisions={revisions}
              activeRevision={activeRevision}
              latestRevisionNumber={latestRevisionNumber}
              firstRevisionNumber={firstRevisionNumber}
              getTypeName={getDisplayName}
            />
          </TabsContent>
        </Tabs>

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
            revoke.run();
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
            unrevoke.run();
          }}
        />

        <DocumentPreviewDialog
          previewFile={previewFile}
          onOpenChange={(open) => {
            if (!open) setPreviewFile(null);
          }}
          onDownload={handleDownload}
        />
      </div>
    </DocumentDetailProvider>
  );
};

export default DocumentDetailPage;
