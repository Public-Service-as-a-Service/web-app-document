'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { Button, Spinner, Badge, Tabs, Input, Textarea, Select } from '@sk-web-gui/react';
import { ArrowLeft, Download, Trash2, Upload, Edit, Save, X, Plus } from 'lucide-react';
import { useDocumentStore } from '@stores/document-store';
import { useDocumentTypeStore } from '@stores/document-type-store';
import { apiService, ApiResponse } from '@services/api-service';
import type { PagedDocumentResponse, Document as DocType, DocumentMetadata } from '@interfaces/document.interface';
import dayjs from 'dayjs';

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const DocumentDetailPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;
  const registrationNumber = params?.registrationNumber as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { currentDocument, currentDocumentLoading, fetchDocument, updateDocument } = useDocumentStore();
  const { types, fetchTypes } = useDocumentTypeStore();

  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [metadataList, setMetadataList] = useState<DocumentMetadata[]>([]);
  const [saving, setSaving] = useState(false);
  const [revisions, setRevisions] = useState<DocType[]>([]);

  useEffect(() => {
    fetchDocument(registrationNumber);
    fetchTypes();
  }, [registrationNumber, fetchDocument, fetchTypes]);

  useEffect(() => {
    if (currentDocument) {
      setDescription(currentDocument.description || '');
      setType(currentDocument.type || '');
      setMetadataList(currentDocument.metadataList || []);
    }
  }, [currentDocument]);

  useEffect(() => {
    const loadRevisions = async () => {
      try {
        const res = await apiService.get<ApiResponse<PagedDocumentResponse>>(
          `documents/${registrationNumber}/revisions?size=50`,
        );
        setRevisions(res.data.data.documents || []);
      } catch {
        // ignore
      }
    };
    loadRevisions();
  }, [registrationNumber]);

  const handleSave = async () => {
    if (!currentDocument) return;
    setSaving(true);
    try {
      await updateDocument(registrationNumber, {
        createdBy: currentDocument.createdBy,
        description,
        type,
        metadataList,
      });
      setEditing(false);
    } catch {
      // error handled in store
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (documentDataId: string, fileName: string) => {
    try {
      const res = await apiService.getBlob(`documents/${registrationNumber}/files/${documentDataId}`);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // error
    }
  };

  const handleDeleteFile = async (documentDataId: string) => {
    if (!confirm(t('common:document_files_delete_confirm'))) return;
    try {
      await apiService.del(`documents/${registrationNumber}/files/${documentDataId}`);
      fetchDocument(registrationNumber);
    } catch {
      // error
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentDocument) return;

    const formData = new FormData();
    formData.append('document', JSON.stringify({ createdBy: currentDocument.createdBy }));
    formData.append('documentFile', file);

    try {
      await apiService.putFormData(`documents/${registrationNumber}/files`, formData);
      fetchDocument(registrationNumber);
    } catch {
      // error
    }
    e.target.value = '';
  };

  const updateMetadataField = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...metadataList];
    updated[index] = { ...updated[index], [field]: val };
    setMetadataList(updated);
  };

  if (currentDocumentLoading) {
    return (
      <div className="flex justify-center py-[6.4rem]">
        <Spinner size={3.2} />
      </div>
    );
  }

  if (!currentDocument) {
    return <p className="py-[3.2rem] text-[1.4rem] text-dark-secondary">{t('common:error_generic')}</p>;
  }

  const doc = currentDocument;

  return (
    <div className="max-w-[84rem]">
      <div className="mb-[2rem]">
        <Button variant="tertiary" size="sm" leftIcon={<ArrowLeft size={16} />} onClick={() => router.push(`/${locale}/documents`)}>
          {t('common:back')}
        </Button>
      </div>

      <div className="mb-[2.4rem] flex items-center justify-between">
        <div>
          <h1 className="text-[2.4rem] font-bold font-mono leading-[3.2rem]">{doc.registrationNumber}</h1>
          <p className="text-[1.4rem] text-dark-secondary mt-[0.4rem]">Revision {doc.revision} &middot; {dayjs(doc.created).format('YYYY-MM-DD HH:mm')}</p>
        </div>
        <div className="flex gap-[0.8rem]">
          {!editing ? (
            <Button variant="secondary" size="sm" leftIcon={<Edit size={16} />} onClick={() => setEditing(true)}>
              {t('common:document_edit')}
            </Button>
          ) : (
            <>
              <Button variant="tertiary" size="sm" leftIcon={<X size={16} />} onClick={() => setEditing(false)}>
                {t('common:cancel')}
              </Button>
              <Button variant="primary" size="sm" leftIcon={<Save size={16} />} onClick={handleSave} loading={saving}>
                {t('common:document_save')}
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs>
        <Tabs.Item>
          <Tabs.Button>{t('common:details')}</Tabs.Button>
          <Tabs.Content>
          <div className="mt-[2rem] space-y-[2rem]">
            <section className="rounded-[1.2rem] bg-background-100 p-[2.4rem] shadow-100">
              <div className="grid grid-cols-2 gap-x-[2.4rem] gap-y-[1.6rem] md:grid-cols-3">
                <div>
                  <p className="mb-[0.2rem] text-[1.2rem] font-semibold uppercase tracking-wide text-dark-secondary">{t('common:documents_type')}</p>
                  {editing ? (
                    <Select className="w-full" value={type} onChange={(e) => setType(e.target.value)}>
                      <option value="">{t('common:document_create_type_placeholder')}</option>
                      {types.map((dt) => (
                        <option key={dt.type} value={dt.type}>{dt.displayName}</option>
                      ))}
                    </Select>
                  ) : (
                    <p className="text-[1.4rem]">{types.find((t) => t.type === doc.type)?.displayName || doc.type}</p>
                  )}
                </div>
                <div>
                  <p className="mb-[0.2rem] text-[1.2rem] font-semibold uppercase tracking-wide text-dark-secondary">{t('common:documents_created_by')}</p>
                  <p className="text-[1.4rem]">{doc.createdBy}</p>
                </div>
                <div>
                  <p className="mb-[0.2rem] text-[1.2rem] font-semibold uppercase tracking-wide text-dark-secondary">{t('common:documents_confidential')}</p>
                  <div className="flex items-center gap-[0.8rem]">
                    {doc.confidentiality?.confidential ? (
                      <Badge color="error" className="text-[1.2rem]">{t('common:yes')}</Badge>
                    ) : (
                      <Badge color="vattjom" className="text-[1.2rem]">{t('common:no')}</Badge>
                    )}
                    {doc.confidentiality?.legalCitation && (
                      <span className="text-[1.3rem] text-dark-secondary">{doc.confidentiality.legalCitation}</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-[0.2rem] text-[1.2rem] font-semibold uppercase tracking-wide text-dark-secondary">{t('common:document_archive')}</p>
                  <p className="text-[1.4rem]">{doc.archive ? t('common:yes') : t('common:no')}</p>
                </div>
              </div>

              <div className="mt-[2rem]">
                <p className="mb-[0.4rem] text-[1.2rem] font-semibold uppercase tracking-wide text-dark-secondary">{t('common:documents_description')}</p>
                {editing ? (
                  <Textarea className="w-full" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                ) : (
                  <p className="text-[1.4rem] whitespace-pre-wrap">{doc.description}</p>
                )}
              </div>
            </section>

            <section className="rounded-[1.2rem] bg-background-100 p-[2.4rem] shadow-100">
              <div className="mb-[1.2rem] flex items-center justify-between">
                <h3 className="text-[1.6rem] font-semibold">{t('common:document_metadata')}</h3>
                {editing && (
                  <Button variant="tertiary" size="sm" leftIcon={<Plus size={16} />} onClick={() => setMetadataList([...metadataList, { key: '', value: '' }])}>
                    {t('common:document_metadata_add')}
                  </Button>
                )}
              </div>
              {metadataList.length === 0 ? (
                <p className="text-[1.4rem] text-dark-secondary">Ingen metadata.</p>
              ) : editing ? (
                <div className="space-y-[0.8rem]">
                  {metadataList.map((m, i) => (
                    <div key={i} className="flex items-center gap-[0.8rem]">
                      <Input className="flex-1" size="sm" placeholder={t('common:document_metadata_key')} value={m.key} onChange={(e) => updateMetadataField(i, 'key', e.target.value)} />
                      <Input className="flex-1" size="sm" placeholder={t('common:document_metadata_value')} value={m.value} onChange={(e) => updateMetadataField(i, 'value', e.target.value)} />
                      <Button variant="ghost" size="sm" iconButton aria-label={`Ta bort metadata ${m.key || `rad ${i + 1}`}`} onClick={() => setMetadataList(metadataList.filter((_, idx) => idx !== i))}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-[0.8rem] md:grid-cols-3">
                  {metadataList.map((m, i) => (
                    <div key={i} className="rounded-[0.6rem] bg-primitives-overlay-darken-1 px-[1.2rem] py-[0.8rem]">
                      <p className="text-[1.2rem] font-semibold text-dark-secondary">{m.key}</p>
                      <p className="text-[1.4rem]">{m.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[1.2rem] bg-background-100 p-[2.4rem] shadow-100">
              <div className="mb-[1.2rem] flex items-center justify-between">
                <h3 className="text-[1.6rem] font-semibold">{t('common:document_files')} ({doc.documentData?.length || 0})</h3>
                <div>
                  <Button variant="secondary" size="sm" leftIcon={<Upload size={16} />} onClick={() => fileInputRef.current?.click()}>
                    {t('common:document_files_upload')}
                  </Button>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleUploadFile} aria-label={t('common:document_files_upload')} />
                </div>
              </div>
              {(!doc.documentData || doc.documentData.length === 0) ? (
                <p className="text-[1.4rem] text-dark-secondary">Inga filer.</p>
              ) : (
                <div className="space-y-[0.8rem]">
                  {doc.documentData.map((file) => (
                    <div key={file.id} className="flex items-center justify-between rounded-[0.8rem] border border-divider p-[1.2rem] transition-colors hover:bg-vattjom-background-100">
                      <div>
                        <p className="text-[1.4rem] font-medium">{file.fileName}</p>
                        <p className="text-[1.2rem] text-dark-secondary">
                          {file.mimeType} &middot; {formatFileSize(file.fileSizeInBytes)}
                        </p>
                      </div>
                      <div className="flex gap-[0.4rem]">
                        <Button variant="tertiary" size="sm" iconButton aria-label={`Ladda ner ${file.fileName}`} onClick={() => handleDownload(file.id, file.fileName)}>
                          <Download size={16} />
                        </Button>
                        <Button variant="tertiary" size="sm" iconButton aria-label={`Ta bort ${file.fileName}`} onClick={() => handleDeleteFile(file.id)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
          </Tabs.Content>
        </Tabs.Item>

        <Tabs.Item>
          <Tabs.Button>{t('common:document_revisions')} ({revisions.length})</Tabs.Button>
          <Tabs.Content>
          <div className="mt-[2rem]">
            {revisions.length === 0 ? (
              <p className="py-[2rem] text-[1.4rem] text-dark-secondary">Inga revisioner.</p>
            ) : (
              <div className="overflow-hidden rounded-[1.2rem] bg-background-100 shadow-100">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-divider bg-primitives-overlay-darken-1">
                      <th scope="col" className="px-[1.6rem] py-[1.2rem] text-left text-[1.3rem] font-semibold uppercase tracking-wide text-dark-secondary">{t('common:document_revision')}</th>
                      <th scope="col" className="px-[1.6rem] py-[1.2rem] text-left text-[1.3rem] font-semibold uppercase tracking-wide text-dark-secondary">{t('common:documents_created')}</th>
                      <th scope="col" className="px-[1.6rem] py-[1.2rem] text-left text-[1.3rem] font-semibold uppercase tracking-wide text-dark-secondary">{t('common:documents_created_by')}</th>
                      <th scope="col" className="px-[1.6rem] py-[1.2rem] text-left text-[1.3rem] font-semibold uppercase tracking-wide text-dark-secondary">{t('common:documents_description')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revisions.map((rev) => (
                      <tr key={rev.revision} className="border-b border-divider last:border-0 transition-colors hover:bg-vattjom-background-100">
                        <td className="px-[1.6rem] py-[1.4rem] text-[1.4rem] font-semibold">{rev.revision}</td>
                        <td className="px-[1.6rem] py-[1.4rem] text-[1.4rem]">{dayjs(rev.created).format('YYYY-MM-DD HH:mm')}</td>
                        <td className="px-[1.6rem] py-[1.4rem] text-[1.4rem]">{rev.createdBy}</td>
                        <td className="px-[1.6rem] py-[1.4rem] text-[1.4rem]">{rev.description?.slice(0, 60)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </Tabs.Content>
        </Tabs.Item>
      </Tabs>
    </div>
  );
};

export default DocumentDetailPage;
