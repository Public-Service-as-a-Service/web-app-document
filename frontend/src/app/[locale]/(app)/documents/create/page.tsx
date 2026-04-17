'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@components/ui/button';
import { Textarea } from '@components/ui/textarea';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import { ArrowLeft, Upload, X, Loader2 } from 'lucide-react';
import { useDocumentTypeStore } from '@stores/document-type-store';
import { useUserStore } from '@stores/user-store';
import { apiService } from '@services/api-service';
import { toast } from 'sonner';
import { DepartmentPicker } from '@components/department-picker/department-picker';
import {
  ResponsibilitiesInput,
  type ResponsibilitiesInputHandle,
} from '@components/responsibilities-input/responsibilities-input';
import { ResponsibilityCard } from '@components/responsibility-card/responsibility-card';
import { createDocumentSchema, type CreateDocumentFormValues } from './schema';

const CreateDocumentPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const responsibilitiesRef = useRef<ResponsibilitiesInputHandle>(null);
  const { types, fetchTypes } = useDocumentTypeStore();
  const { user } = useUserStore();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CreateDocumentFormValues>({
    resolver: zodResolver(createDocumentSchema),
    defaultValues: {
      description: '',
      type: '',
      responsibilities: [],
      validFrom: '',
      validTo: '',
    },
  });

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
      const metadataList = data.departmentOrgId
        ? [
            { key: 'departmentOrgId', value: data.departmentOrgId },
            { key: 'departmentOrgName', value: data.departmentOrgName || '' },
          ]
        : [];

      const responsibilities = (getValues('responsibilities') || []).map((username) => ({
        username,
      }));

      const documentData = {
        createdBy: user.username,
        description: data.description,
        type: data.type,
        metadataList,
        ...(responsibilities.length > 0 ? { responsibilities } : {}),
        ...(data.validFrom ? { validFrom: data.validFrom } : {}),
        ...(data.validTo ? { validTo: data.validTo } : {}),
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
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/documents`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common:back')}
        </Button>
      </div>

      <h1 className="mb-6 text-2xl font-bold">{t('common:document_create_title')}</h1>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = (await responsibilitiesRef.current?.flush()) ?? true;
          if (!ok) return;
          await handleSubmit(onSubmit)(e);
        }}
        className="space-y-5"
      >
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

          <div className="grid gap-5 md:grid-cols-2">
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

          <div className="space-y-2">
            <Label>{t('common:document_responsibilities_label')}</Label>
            <Controller
              name="responsibilities"
              control={control}
              render={({ field }) => (
                <ResponsibilitiesInput
                  ref={responsibilitiesRef}
                  value={field.value || []}
                  onChange={field.onChange}
                  validateUser
                  renderItem={(username, onRemove) => (
                    <ResponsibilityCard username={username} onRemove={onRemove} />
                  )}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              {t('common:document_responsibilities_helper')}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="validFrom">
                {t('common:document_create_valid_from_label')}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input id="validFrom" type="date" {...register('validFrom')} />
              {errors.validFrom && (
                <p className="text-xs text-destructive">{t('common:error_required')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="validTo">
                {t('common:document_create_valid_to_label')}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input id="validTo" type="date" {...register('validTo')} />
              {errors.validTo && (
                <p className="text-xs text-destructive">
                  {t('common:document_create_validity_range_error')}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground md:col-span-2">
              {t('common:document_create_validity_hint')}
            </p>
          </div>
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
            aria-label={t('common:document_create_files_select_aria')}
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
            <p className="text-sm font-medium text-foreground">
              {t('common:document_create_files_dropzone')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('common:document_create_files_dropzone_hint')}
            </p>
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
                    className="rounded-sm text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t('common:document_create_files_remove_aria', { name: f.name })}
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
        {files.length === 0 && (
          <p
            aria-live="polite"
            className="text-right text-xs text-muted-foreground"
            id="files-required-hint"
          >
            {t('common:document_create_helper_files')}
          </p>
        )}
      </form>
    </div>
  );
};

export default CreateDocumentPage;
