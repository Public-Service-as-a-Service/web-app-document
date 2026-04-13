'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { ConfirmDialog } from '@components/ui/confirm-dialog';
import { Plus, Edit, Trash2, Settings, Loader2 } from 'lucide-react';
import { useDocumentTypeStore } from '@stores/document-type-store';
import EmptyState from '@components/empty-state/empty-state';
import { toast } from 'sonner';

const DocumentTypesPage = () => {
  const { t } = useTranslation();
  const { types, loading, fetchTypes, createType, updateType, deleteType } = useDocumentTypeStore();

  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [formType, setFormType] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const openCreateModal = () => {
    setEditingType(null);
    setFormType('');
    setFormDisplayName('');
    setShowModal(true);
  };

  const openEditModal = (type: string, displayName: string) => {
    setEditingType(type);
    setFormType(type);
    setFormDisplayName(displayName);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formDisplayName) return;
    setSubmitting(true);

    try {
      if (editingType) {
        await updateType(editingType, { displayName: formDisplayName, updatedBy: 'admin' });
        toast.success(t('common:document_types_updated'));
      } else {
        if (!formType) return;
        await createType({ type: formType, displayName: formDisplayName, createdBy: 'admin' });
        toast.success(t('common:document_types_created'));
      }
      setShowModal(false);
    } catch {
      toast.error(
        editingType
          ? t('common:document_types_error_update')
          : t('common:document_types_error_create')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (type: string) => {
    try {
      await deleteType(type);
      toast.success(t('common:document_types_deleted'));
    } catch {
      toast.error(t('common:document_types_error_delete'));
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('common:document_types_title')}</h1>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          {t('common:document_types_create')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : types.length === 0 ? (
        <EmptyState
          icon={<Settings size={48} />}
          title={t('common:document_types_no_results')}
          actionLabel={t('common:document_types_create')}
          onAction={openCreateModal}
        />
      ) : (
        <div className="overflow-hidden rounded-xl bg-card shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {t('common:document_types_type')}
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {t('common:document_types_display_name')}
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {t('common:actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {types.map((dt) => (
                <tr
                  key={dt.type}
                  className="border-b border-border last:border-0 transition-colors hover:bg-accent"
                >
                  <td className="px-4 py-3.5 text-sm font-mono">{dt.type}</td>
                  <td className="px-4 py-3.5 text-sm">{dt.displayName}</td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Redigera ${dt.displayName}`}
                        onClick={() => openEditModal(dt.type, dt.displayName)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Ta bort ${dt.displayName}`}
                        onClick={() => setDeleteTarget(dt.type)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? t('common:document_types_edit') : t('common:document_types_create')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="modal-type">
                {t('common:document_types_type')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="modal-type"
                className="w-full"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                disabled={!!editingType}
                placeholder="EMPLOYMENT_CERTIFICATE"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-display-name">
                {t('common:document_types_display_name')}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="modal-display-name"
                className="w-full"
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
                placeholder="Anställningsbevis"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              {t('common:cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formDisplayName || (!editingType && !formType) || submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingType ? t('common:update') : t('common:create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t('common:document_types_delete_confirm', { type: deleteTarget ?? '' })}
        confirmLabel={t('common:delete')}
        cancelLabel={t('common:cancel')}
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
      />
    </div>
  );
};

export default DocumentTypesPage;
