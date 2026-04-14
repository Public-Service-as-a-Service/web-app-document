'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { useUserStore } from '@stores/user-store';
import { apiService } from '@services/api-service';
import { toast } from 'sonner';
import { DepartmentPicker } from '@components/department-picker/department-picker';
import { createDocumentSchema, type CreateDocumentFormValues } from './schema';

const CreateDocumentPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { types, fetchTypes } = useDocumentTypeStore();
  const { user } = useUserStore();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateDocumentFormValues>({
    resolver: zodResolver(createDocumentSchema),
    defaultValues: {
      description: '',
      type: '',
      confidential: false,
      legalCitation: '',
      metadataList: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'metadataList' });
  const confidential = watch('confidential');

  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [selectedDeptName, setSelectedDeptName] = useState('');

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

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

  const onSubmit = async (data: CreateDocumentFormValues) => {
    if (files.length === 0) return;

    try {
      const metadataList = data.metadataList.filter((m) => m.key && m.value);
      if (data.departmentOrgId) {
        metadataList.push(
          { key: 'departmentOrgId', value: data.departmentOrgId },
          { key: 'departmentOrgName', value: data.departmentOrgName || '' }
        );
      }

      const documentData = {
        createdBy: user.username,
        description: data.description,
        type: data.type,
        metadataList,
        ...(data.confidential && {
          confidentiality: { confidential: true, legalCitation: data.legalCitation || '' },
        }),
      };

      const formData = new FormData();
      formData.append(
        'document',
        new Blob([JSON.stringify(documentData)], { type: 'application/json' })
      );
      files.forEach((file) => formData.append('documentFiles', file));

      await apiService.postFormData('documents', formData);
      toast.success(t('common:document_create_success'));
      router.push(`/${locale}/documents`);
    } catch {
      toast.error(t('common:document_create_error'));
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-5">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/documents`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common:back')}
        </Button>
      </div>

      <h1 className="mb-6 text-2xl font-bold">{t('common:document_create_title')}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <section className="rounded-xl bg-card p-6 shadow-sm space-y-5">
          <div className="space-y-2">
            <Label htmlFor="description">
              {t('common:document_create_description_label')}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea id="description" className="w-full" rows={3} {...register('description')} />
            {errors.description && (
              <p className="text-xs text-destructive">{t('common:error_required')}</p>
            )}
          </div>

          <div className="md:w-1/2">
            <div className="space-y-2">
              <Label htmlFor="type">
                {t('common:document_create_type_label')} <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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
                )}
              />
              {errors.type && (
                <p className="text-xs text-destructive">{t('common:error_required')}</p>
              )}
            </div>
          </div>

          <div className="md:w-1/2">
            <div className="space-y-2">
              <Label>{t('common:document_create_department_label')}</Label>
              <Controller
                name="departmentOrgId"
                control={control}
                render={({ field }) => (
                  <DepartmentPicker
                    value={
                      field.value ? { orgId: Number(field.value), orgName: selectedDeptName } : null
                    }
                    onChange={(dept) => {
                      field.onChange(dept ? String(dept.orgId) : undefined);
                      setValue('departmentOrgName', dept?.orgName || '');
                      setSelectedDeptName(dept?.orgName || '');
                    }}
                  />
                )}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Controller
              name="confidential"
              control={control}
              render={({ field }) => (
                <Switch id="confidential" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
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
                placeholder="25 kap. 1 § OSL"
                {...register('legalCitation')}
              />
            </div>
          )}
        </section>

        <section className="rounded-xl bg-card p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold">
              {t('common:document_create_metadata_label')}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => append({ key: '', value: '' })}
              type="button"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('common:document_metadata_add')}
            </Button>
          </div>
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen metadata tillagd.</p>
          ) : (
            <div className="space-y-2">
              {fields.map((field, i) => (
                <div key={field.id} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    placeholder={t('common:document_metadata_key')}
                    {...register(`metadataList.${i}.key`)}
                  />
                  <Input
                    className="flex-1"
                    placeholder={t('common:document_metadata_value')}
                    {...register(`metadataList.${i}.value`)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Ta bort metadata rad ${i + 1}`}
                    onClick={() => remove(i)}
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
            {t('common:document_create_files_label')} <span className="text-destructive">*</span>
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
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = '';
              }}
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
          <Button type="submit" disabled={files.length === 0 || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common:create')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateDocumentPage;
