'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { Button, Input, Textarea, Select, Switch, FormControl, FormLabel } from '@sk-web-gui/react';
import { ArrowLeft, Plus, Trash2, Upload, X } from 'lucide-react';
import { useDocumentTypeStore } from '@stores/document-type-store';
import { apiService } from '@services/api-service';
import type { DocumentMetadata } from '@interfaces/document.interface';

const CreateDocumentPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { types, fetchTypes } = useDocumentTypeStore();

  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [confidential, setConfidential] = useState(false);
  const [legalCitation, setLegalCitation] = useState('');
  const [metadataList, setMetadataList] = useState<DocumentMetadata[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const addMetadata = () => setMetadataList([...metadataList, { key: '', value: '' }]);
  const removeMetadata = (index: number) => setMetadataList(metadataList.filter((_, i) => i !== index));
  const updateMetadata = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...metadataList];
    updated[index] = { ...updated[index], [field]: val };
    setMetadataList(updated);
  };

  const addFiles = (newFiles: FileList | File[]) => {
    setFiles((prev) => [...prev, ...Array.from(newFiles)]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !type || !createdBy || files.length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const documentData = {
        createdBy,
        description,
        type,
        metadataList: metadataList.filter((m) => m.key && m.value),
        ...(confidential && {
          confidentiality: { confidential: true, legalCitation: legalCitation || '' },
        }),
      };

      const formData = new FormData();
      formData.append('document', new Blob([JSON.stringify(documentData)], { type: 'application/json' }));
      files.forEach((file) => formData.append('documentFiles', file));

      await apiService.postFormData('documents', formData);
      router.push(`/${locale}/documents`);
    } catch {
      setError(t('common:error_generic'));
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = description && type && createdBy && files.length > 0;

  return (
    <div className="max-w-[72rem]">
      <div className="mb-[2rem]">
        <Button variant="tertiary" size="sm" leftIcon={<ArrowLeft size={16} />} onClick={() => router.push(`/${locale}/documents`)}>
          {t('common:back')}
        </Button>
      </div>

      <h1 className="mb-[2.4rem] text-[2.4rem] font-bold leading-[3.2rem]">{t('common:document_create_title')}</h1>

      {error && (
        <div className="mb-[1.6rem] rounded-[0.8rem] bg-error-surface-primary p-[1.6rem] text-[1.4rem] text-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-[2rem]">
        <section className="rounded-[1.2rem] bg-background-100 p-[2.4rem] shadow-100 space-y-[2rem]">
          <FormControl required className="w-full">
            <FormLabel>{t('common:document_create_description_label')}</FormLabel>
            <Textarea className="w-full" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </FormControl>

          <div className="grid grid-cols-1 gap-[1.6rem] md:grid-cols-2">
            <FormControl required className="w-full">
              <FormLabel>{t('common:document_create_type_label')}</FormLabel>
              <Select className="w-full" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">{t('common:document_create_type_placeholder')}</option>
                {types.map((dt) => (
                  <option key={dt.type} value={dt.type}>{dt.displayName}</option>
                ))}
              </Select>
            </FormControl>

            <FormControl required className="w-full">
              <FormLabel>{t('common:document_create_created_by_label')}</FormLabel>
              <Input className="w-full" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
            </FormControl>
          </div>

          <div className="flex items-center gap-[1.2rem]">
            <Switch checked={confidential} onChange={(e) => setConfidential(e.target.checked)} />
            <span className="text-[1.4rem]">{t('common:document_create_confidential_label')}</span>
          </div>
          {confidential && (
            <FormControl className="w-full md:w-1/2">
              <FormLabel>{t('common:document_legal_citation')}</FormLabel>
              <Input className="w-full" value={legalCitation} onChange={(e) => setLegalCitation(e.target.value)} placeholder="25 kap. 1 § OSL" />
            </FormControl>
          )}
        </section>

        <section className="rounded-[1.2rem] bg-background-100 p-[2.4rem] shadow-100">
          <div className="mb-[1.2rem] flex items-center justify-between">
            <h3 className="text-[1.6rem] font-semibold">{t('common:document_create_metadata_label')}</h3>
            <Button variant="tertiary" size="sm" leftIcon={<Plus size={16} />} onClick={addMetadata} type="button">
              {t('common:document_metadata_add')}
            </Button>
          </div>
          {metadataList.length === 0 ? (
            <p className="text-[1.4rem] text-dark-secondary">Ingen metadata tillagd.</p>
          ) : (
            <div className="space-y-[0.8rem]">
              {metadataList.map((m, i) => (
                <div key={i} className="flex items-center gap-[0.8rem]">
                  <Input className="flex-1" size="sm" placeholder={t('common:document_metadata_key')} value={m.key} onChange={(e) => updateMetadata(i, 'key', e.target.value)} />
                  <Input className="flex-1" size="sm" placeholder={t('common:document_metadata_value')} value={m.value} onChange={(e) => updateMetadata(i, 'value', e.target.value)} />
                  <Button variant="ghost" size="sm" iconButton aria-label={`Ta bort metadata ${m.key || `rad ${i + 1}`}`} onClick={() => removeMetadata(i)} type="button">
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[1.2rem] bg-background-100 p-[2.4rem] shadow-100">
          <h3 className="mb-[1.2rem] text-[1.6rem] font-semibold">{t('common:document_create_files_label')}</h3>
          <div
            className={`flex flex-col items-center justify-center rounded-[0.8rem] border-2 border-dashed p-[3.2rem] transition-colors cursor-pointer ${
              dragOver ? 'border-vattjom-surface-primary bg-vattjom-background-100' : 'border-gray-300 hover:border-gray-400'
            }`}
            role="button"
            tabIndex={0}
            aria-label="Välj filer att ladda upp"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={32} className="mb-[1.2rem] text-dark-secondary" />
            <p className="text-[1.4rem] font-medium text-dark-primary">Dra och släpp filer här</p>
            <p className="text-[1.3rem] text-dark-secondary">eller klicka för att välja</p>
            <input ref={fileInputRef} type="file" multiple onChange={(e) => e.target.files && addFiles(e.target.files)} className="hidden" />
          </div>

          {files.length > 0 && (
            <div className="mt-[1.2rem] space-y-[0.6rem]">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-[0.6rem] bg-primitives-overlay-darken-1 px-[1.2rem] py-[0.8rem]">
                  <span className="text-[1.4rem]">{f.name} <span className="text-dark-secondary">({(f.size / 1024).toFixed(0)} KB)</span></span>
                  <button type="button" onClick={() => removeFile(i)} className="text-dark-secondary hover:text-error" aria-label={`Ta bort fil ${f.name}`}>
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex justify-end gap-[1.2rem]">
          <Button variant="secondary" onClick={() => router.push(`/${locale}/documents`)} type="button">
            {t('common:cancel')}
          </Button>
          <Button variant="primary" type="submit" loading={submitting} disabled={!isValid}>
            {t('common:create')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateDocumentPage;
