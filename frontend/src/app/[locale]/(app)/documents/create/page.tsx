'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@components/ui/button';
import { Textarea } from '@components/ui/textarea';
import { Input } from '@components/ui/input';
import { Card, CardContent } from '@components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@components/ui/field';
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
import { apiService, ApiResponse } from '@services/api-service';
import { getEmployee } from '@services/employee-service';
import type { DocumentDto } from '@data-contracts/backend/data-contracts';
import { toast } from 'sonner';
import { DepartmentPicker } from '@components/department-picker/department-picker';
import {
  ResponsibilitiesInput,
  type ResponsibilitiesInputHandle,
} from '@components/responsibilities-input/responsibilities-input';
import { ResponsibilityCard } from '@components/responsibility-card/responsibility-card';
import { getDeepestOrgSegment } from '@utils/parse-org-tree';
import { createDocumentSchema, type CreateDocumentFormValues } from './schema';

const CreateDocumentPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const responsibilitiesRef = useRef<ResponsibilitiesInputHandle>(null);
  const { types, fetchTypes } = useDocumentTypeStore();
  const { user } = useUserStore();

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { isSubmitting },
  } = useForm<CreateDocumentFormValues>({
    resolver: zodResolver(createDocumentSchema),
    defaultValues: {
      title: '',
      description: '',
      type: '',
      responsibilities: [],
      validFrom: '',
      validTo: '',
    },
  });

  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [filesInvalid, setFilesInvalid] = useState(false);
  const [selectedDeptName, setSelectedDeptName] = useState('');

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  // Pre-populate the department from the user's portal-person org tree
  // (deepest segment = most specific placement, typically their unit).
  // Skips if the user has already picked one or has no org tree on record.
  useEffect(() => {
    if (!user.username) return;
    let cancelled = false;
    (async () => {
      try {
        const profile = await getEmployee(user.username);
        if (cancelled) return;
        if (getValues('departmentOrgId')) return;
        const segment = getDeepestOrgSegment(profile.orgTree);
        if (!segment) return;
        setValue('departmentOrgId', String(segment.orgId));
        setValue('departmentOrgName', segment.orgName);
        setSelectedDeptName(segment.orgName);
      } catch {
        // No portal-person profile (external user, lookup failure) — leave blank.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.username, getValues, setValue]);

  const addFiles = (newFiles: FileList | File[]) => {
    setFiles((prev) => [...prev, ...Array.from(newFiles)]);
    setFilesInvalid(false);
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
    if (files.length === 0) {
      setFilesInvalid(true);
      dropzoneRef.current?.focus();
      return;
    }

    try {
      const metadataList = data.departmentOrgId
        ? [
            { key: 'departmentOrgId', value: data.departmentOrgId },
            { key: 'departmentOrgName', value: data.departmentOrgName || '' },
          ]
        : [];

      const responsibilities = (getValues('responsibilities') || []).map((personId) => ({
        personId,
      }));

      const documentData = {
        createdBy: user.personId,
        title: data.title,
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

      const res = await apiService.postFormData<ApiResponse<DocumentDto>>(
        'documents',
        formData
      );
      toast.success(t('common:document_create_success'));
      // New documents land as DRAFT and are hidden from the shared list, so
      // dropping the user back on /documents loses the one they just made.
      // Send them straight to the detail page where they can publish it.
      const registrationNumber = res.data?.data?.registrationNumber;
      if (registrationNumber) {
        router.push(`/${locale}/documents/${registrationNumber}`);
      } else {
        router.push(`/${locale}/documents`);
      }
    } catch {
      toast.error(t('common:document_create_error'));
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-5">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/documents`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common:back')}
        </Button>
      </div>

      <header className="mb-8 max-w-[62ch]">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t('common:document_create_eyebrow')}
        </p>
        <h1 className="mt-1.5 font-serif text-[28px] font-normal leading-[1.12] tracking-[-0.015em] text-foreground md:text-[36px]">
          {t('common:document_create_title')}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground md:text-[16.5px]">
          {t('common:document_create_intro')}
        </p>
      </header>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setFilesInvalid(files.length === 0);
          const ok = (await responsibilitiesRef.current?.flush()) ?? true;
          if (!ok) return;
          await handleSubmit(onSubmit)(e);
        }}
        className="space-y-5"
      >
        <Card>
          <CardContent>
            <FieldGroup>
              <Controller
                name="title"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="title">
                      {t('common:document_title_label')}{' '}
                      <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      {...field}
                      id="title"
                      maxLength={255}
                      placeholder={t('common:document_title_placeholder')}
                      aria-invalid={fieldState.invalid}
                      aria-describedby="title-description"
                    />
                    <FieldDescription id="title-description" className="text-xs">
                      {t('common:document_create_title_hint')}
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError className="text-xs">
                        {t('common:error_required')}
                      </FieldError>
                    )}
                  </Field>
                )}
              />

              <Controller
                name="description"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="description">
                      {t('common:document_create_description_label')}{' '}
                      <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Textarea
                      {...field}
                      id="description"
                      rows={3}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError className="text-xs">
                        {t('common:error_required')}
                      </FieldError>
                    )}
                  </Field>
                )}
              />

              <div className="grid gap-5 md:grid-cols-2">
                <Controller
                  name="type"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="type">
                        {t('common:document_create_type_label')}{' '}
                        <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Select
                        name={field.name}
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          ref={field.ref}
                          onBlur={field.onBlur}
                          id="type"
                          aria-invalid={fieldState.invalid}
                        >
                          <SelectValue
                            placeholder={t('common:document_create_type_placeholder')}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {types.map((dt) => (
                            <SelectItem key={dt.type} value={dt.type}>
                              {dt.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && (
                        <FieldError className="text-xs">
                          {t('common:error_required')}
                        </FieldError>
                      )}
                    </Field>
                  )}
                />

                <Controller
                  name="departmentOrgId"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>{t('common:document_create_department_label')}</FieldLabel>
                      <DepartmentPicker
                        value={
                          field.value
                            ? { orgId: Number(field.value), orgName: selectedDeptName }
                            : null
                        }
                        onChange={(dept) => {
                          field.onChange(dept ? String(dept.orgId) : undefined);
                          setValue('departmentOrgName', dept?.orgName || '');
                          setSelectedDeptName(dept?.orgName || '');
                        }}
                      />
                    </Field>
                  )}
                />
              </div>

              <Controller
                name="responsibilities"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>
                      {t('common:document_responsibilities_label')}{' '}
                      <span className="text-destructive">*</span>
                    </FieldLabel>
                    <ResponsibilitiesInput
                      ref={responsibilitiesRef}
                      value={field.value || []}
                      onChange={field.onChange}
                      validateUser
                      invalid={fieldState.invalid}
                      renderItem={(personId, onRemove) => (
                        <ResponsibilityCard personId={personId} onRemove={onRemove} />
                      )}
                    />
                    <FieldDescription className="text-xs">
                      {t('common:document_responsibilities_helper_required')}
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError className="text-xs">
                        {t('common:document_responsibilities_required')}
                      </FieldError>
                    )}
                  </Field>
                )}
              />

              <div className="grid gap-5 md:grid-cols-2">
                <Controller
                  name="validFrom"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="validFrom">
                        {t('common:document_create_valid_from_label')}{' '}
                        <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        {...field}
                        id="validFrom"
                        type="date"
                        aria-invalid={fieldState.invalid}
                        aria-describedby="validity-description"
                      />
                      {fieldState.invalid && (
                        <FieldError className="text-xs">
                          {t('common:error_required')}
                        </FieldError>
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="validTo"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="validTo">
                        {t('common:document_create_valid_to_label')}{' '}
                        <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        {...field}
                        id="validTo"
                        type="date"
                        aria-invalid={fieldState.invalid}
                        aria-describedby="validity-description"
                      />
                      {fieldState.invalid && (
                        <FieldError className="text-xs">
                          {t('common:document_create_validity_range_error')}
                        </FieldError>
                      )}
                    </Field>
                  )}
                />
              </div>
              <FieldDescription id="validity-description" className="text-xs">
                {t('common:document_create_validity_hint')}
              </FieldDescription>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="mb-3 text-base font-semibold">
              {t('common:document_create_files_label')}{' '}
              <span className="text-destructive">*</span>
            </h3>
            <div
              ref={dropzoneRef}
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer ${
                filesInvalid
                  ? 'border-destructive bg-destructive/5'
                  : dragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground'
              }`}
              role="button"
              tabIndex={0}
              aria-label={t('common:document_create_files_select_aria')}
              aria-describedby="files-hint"
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
              <ul className="mt-3 space-y-1.5">
                {files.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-lg bg-muted pl-3 pr-1 py-1"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {f.name}{' '}
                      <span className="text-muted-foreground">
                        ({(f.size / 1024).toFixed(0)} KB)
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:h-9 sm:w-9"
                      onClick={() => removeFile(i)}
                      aria-label={t('common:document_create_files_remove_aria', { name: f.name })}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {filesInvalid ? (
              <p
                id="files-hint"
                role="alert"
                className="mt-3 text-xs text-destructive"
              >
                {t('common:error_required')}
              </p>
            ) : files.length === 0 ? (
              <p
                id="files-hint"
                aria-live="polite"
                className="mt-3 text-xs text-muted-foreground"
              >
                {t('common:document_create_helper_files')}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:static sm:z-auto sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              variant="secondary"
              onClick={() => router.push(`/${locale}/documents`)}
              type="button"
              className="h-11 w-full sm:h-9 sm:w-auto"
            >
              {t('common:cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full sm:h-9 sm:w-auto"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common:create')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateDocumentPage;
