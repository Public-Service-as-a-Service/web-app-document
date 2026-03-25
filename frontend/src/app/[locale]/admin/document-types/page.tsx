'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Spinner, Modal, FormControl, FormLabel } from '@sk-web-gui/react';
import { Plus, Edit, Trash2, Settings } from 'lucide-react';
import { useDocumentTypeStore } from '@stores/document-type-store';
import EmptyState from '@components/empty-state/empty-state';

const DocumentTypesPage = () => {
  const { t } = useTranslation();
  const { types, loading, fetchTypes, createType, updateType, deleteType } = useDocumentTypeStore();

  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [formType, setFormType] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      } else {
        if (!formType) return;
        await createType({ type: formType, displayName: formDisplayName, createdBy: 'admin' });
      }
      setShowModal(false);
    } catch {
      // error handled in store
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (type: string) => {
    if (!confirm(t('common:document_types_delete_confirm', { type }))) return;
    try {
      await deleteType(type);
    } catch {
      // error handled in store
    }
  };

  return (
    <div className="max-w-[72rem]">
      <div className="mb-[2.4rem] flex items-center justify-between">
        <h1 className="text-[2.4rem] font-bold leading-[3.2rem]">{t('common:document_types_title')}</h1>
        <Button variant="primary" leftIcon={<Plus size={18} />} onClick={openCreateModal}>
          {t('common:document_types_create')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-[6.4rem]">
          <Spinner size={3.2} />
        </div>
      ) : types.length === 0 ? (
        <EmptyState
          icon={<Settings size={48} />}
          title={t('common:document_types_no_results')}
          actionLabel={t('common:document_types_create')}
          onAction={openCreateModal}
        />
      ) : (
        <div className="overflow-hidden rounded-[1.2rem] bg-background-100 shadow-100">
          <table className="w-full">
            <thead>
              <tr className="border-b border-divider bg-primitives-overlay-darken-1">
                <th scope="col" className="px-[1.6rem] py-[1.2rem] text-left text-[1.3rem] font-semibold uppercase tracking-wide text-dark-secondary">{t('common:document_types_type')}</th>
                <th scope="col" className="px-[1.6rem] py-[1.2rem] text-left text-[1.3rem] font-semibold uppercase tracking-wide text-dark-secondary">{t('common:document_types_display_name')}</th>
                <th scope="col" className="px-[1.6rem] py-[1.2rem] text-right text-[1.3rem] font-semibold uppercase tracking-wide text-dark-secondary">{t('common:actions')}</th>
              </tr>
            </thead>
            <tbody>
              {types.map((dt) => (
                <tr key={dt.type} className="border-b border-divider last:border-0 transition-colors hover:bg-vattjom-background-100">
                  <td className="px-[1.6rem] py-[1.4rem] text-[1.4rem] font-mono">{dt.type}</td>
                  <td className="px-[1.6rem] py-[1.4rem] text-[1.4rem]">{dt.displayName}</td>
                  <td className="px-[1.6rem] py-[1.4rem] text-right">
                    <div className="flex justify-end gap-[0.4rem]">
                      <Button variant="tertiary" size="sm" iconButton aria-label={`Redigera ${dt.displayName}`} onClick={() => openEditModal(dt.type, dt.displayName)}>
                        <Edit size={16} />
                      </Button>
                      <Button variant="tertiary" size="sm" iconButton aria-label={`Ta bort ${dt.displayName}`} onClick={() => handleDelete(dt.type)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal show onClose={() => setShowModal(false)} aria-labelledby="document-type-modal-title">
          <Modal.Content>
            <h2 id="document-type-modal-title" className="px-[2.4rem] pt-[2.4rem] text-[1.8rem] font-semibold">
              {editingType ? t('common:document_types_edit') : t('common:document_types_create')}
            </h2>
            <div className="space-y-[1.6rem] p-[2.4rem]">
              <FormControl required className="w-full">
                <FormLabel>{t('common:document_types_type')}</FormLabel>
                <Input
                  className="w-full"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  disabled={!!editingType}
                  placeholder="EMPLOYMENT_CERTIFICATE"
                />
              </FormControl>
              <FormControl required className="w-full">
                <FormLabel>{t('common:document_types_display_name')}</FormLabel>
                <Input
                  className="w-full"
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  placeholder="Anställningsbevis"
                />
              </FormControl>
            </div>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                {t('common:cancel')}
              </Button>
              <Button variant="primary" onClick={handleSubmit} loading={submitting} disabled={!formDisplayName || (!editingType && !formType)}>
                {editingType ? t('common:update') : t('common:create')}
              </Button>
            </Modal.Footer>
          </Modal.Content>
        </Modal>
      )}
    </div>
  );
};

export default DocumentTypesPage;
