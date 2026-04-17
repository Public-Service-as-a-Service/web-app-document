'use client';

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit, Loader2, Save, UserCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import {
  ResponsibilitiesInput,
  type ResponsibilitiesInputHandle,
} from '@components/responsibilities-input/responsibilities-input';
import { ResponsibilityCard } from '@components/responsibility-card/responsibility-card';
import type { DocumentDto } from '@data-contracts/backend/data-contracts';
import { useDocumentDetail } from './document-detail-context';

interface ResponsibilitiesTabProps {
  onSave: (usernames: string[]) => Promise<boolean>;
}

const toUsernameList = (doc: DocumentDto) =>
  (doc.responsibilities || []).map((r) => r.username);

export const ResponsibilitiesTab = ({ onSave }: ResponsibilitiesTabProps) => {
  const { t } = useTranslation();
  const { doc, canEdit } = useDocumentDetail();
  const responsibilitiesRef = useRef<ResponsibilitiesInputHandle>(null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(() => toUsernameList(doc));
  const [saving, setSaving] = useState(false);

  // Reset draft when the document changes (revision switch or save reload) —
  // React 19's "reset state during render" pattern avoids a useEffect.
  const [docSnapshot, setDocSnapshot] = useState(doc);
  if (doc !== docSnapshot) {
    setDocSnapshot(doc);
    setDraft(toUsernameList(doc));
    setEditing(false);
  }

  const handleSave = async () => {
    const ok = (await responsibilitiesRef.current?.flush()) ?? true;
    if (!ok) return;

    if (draft.length === 0) {
      // Documents must always have an owner on file, so block the save
      // rather than letting the upstream PUT strip the last responsibility.
      toast.error(t('common:document_responsibilities_required'));
      return;
    }

    setSaving(true);
    try {
      const success = await onSave(draft);
      if (success) setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(toUsernameList(doc));
    setEditing(false);
  };

  return (
    <div className="mt-5">
      <Card className="gap-0 border-0 p-6">
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
          {canEdit && !editing && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Edit className="mr-2 h-4 w-4" />
              {t('common:document_responsibilities_edit')}
            </Button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <ResponsibilitiesInput
              ref={responsibilitiesRef}
              value={draft}
              onChange={setDraft}
              validateUser
              renderItem={(username, onRemove) => (
                <ResponsibilityCard username={username} onRemove={onRemove} />
              )}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
                <X className="mr-1.5 h-4 w-4" />
                {t('common:cancel')}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
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
      </Card>
    </div>
  );
};
