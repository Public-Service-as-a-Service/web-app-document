'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
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
import { ArrowLeft, Plus, Trash2, Upload, X, Loader2 } from 'lucide-react';
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
  const removeMetadata = (index: number) =>
    setMetadataList(metadataList.filter((_, i) => i !== index));
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
      formData.append(
        'document',
        new Blob([JSON.stringify(documentData)], { type: 'application/json' })
      );
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
    <div className="max-w-3xl">
      <div className="mb-5">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/documents`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common:back')}
        </Button>
      </div>

      <h1 className="mb-6 text-2xl font-bold">{t('common:document_create_title')}</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="rounded-xl bg-card p-6 shadow-sm space-y-5">
          <div className="space-y-2">
            <Label htmlFor="description">
              {t('common:document_create_description_label')}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              className="w-full"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">
                {t('common:document_create_type_label')} <span className="text-destructive">*</span>
              </Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type" className="w-full">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="createdBy">
                {t('common:document_create_created_by_label')}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="createdBy"
                className="w-full"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="confidential" checked={confidential} onCheckedChange={setConfidential} />
            <Label htmlFor="confidential" className="cursor-pointer">
              {t('common:document_create_confidential_label')}
            </Label>
          </div>
          {confidential && (
            <div className="space-y-2 md:w-1/2">
              <Label htmlFor="legalCitation">{t('common:document_legal_citation')}</Label>
              <Input
                id="legalCitation"
                className="w-full"
                value={legalCitation}
                onChange={(e) => setLegalCitation(e.target.value)}
                placeholder="25 kap. 1 § OSL"
              />
            </div>
          )}
        </section>

        <section className="rounded-xl bg-card p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold">
              {t('common:document_create_metadata_label')}
            </h3>
            <Button variant="ghost" size="sm" onClick={addMetadata} type="button">
              <Plus className="mr-2 h-4 w-4" />
              {t('common:document_metadata_add')}
            </Button>
          </div>
          {metadataList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen metadata tillagd.</p>
          ) : (
            <div className="space-y-2">
              {metadataList.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    placeholder={t('common:document_metadata_key')}
                    value={m.key}
                    onChange={(e) => updateMetadata(i, 'key', e.target.value)}
                  />
                  <Input
                    className="flex-1"
                    placeholder={t('common:document_metadata_value')}
                    value={m.value}
                    onChange={(e) => updateMetadata(i, 'value', e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Ta bort metadata ${m.key || `rad ${i + 1}`}`}
                    onClick={() => removeMetadata(i)}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl bg-card p-6 shadow-sm">
          <h3 className="mb-3 text-base font-semibold">
            {t('common:document_create_files_label')}
          </h3>
          <div
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground'
            }`}
            role="button"
            tabIndex={0}
            aria-label="Välj filer att ladda upp"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={32} className="mb-3 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Dra och släpp filer här</p>
            <p className="text-xs text-muted-foreground">eller klicka för att välja</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => e.target.files && addFiles(e.target.files)}
              className="hidden"
            />
          </div>

          {files.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-muted px-3 py-2"
                >
                  <span className="text-sm">
                    {f.name}{' '}
                    <span className="text-muted-foreground">({(f.size / 1024).toFixed(0)} KB)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Ta bort fil ${f.name}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push(`/${locale}/documents`)}
            type="button"
          >
            {t('common:cancel')}
          </Button>
          <Button type="submit" disabled={!isValid || submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common:create')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateDocumentPage;
