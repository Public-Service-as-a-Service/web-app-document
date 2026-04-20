import type { TFunction } from 'i18next';
import type { DocumentDto } from '@data-contracts/backend/data-contracts';
import { DocumentStatusEnum } from '@data-contracts/backend/data-contracts';
import { formatDateDisplay } from './document-detail-helpers';

// Public-links section is driven by lifecycle status:
//   - ACTIVE shows the link list.
//   - SCHEDULED also shows the link list so editors can preview/copy — with a
//     notice banner clarifying that the URLs go live on `validFrom`.
//   - EXPIRED / REVOKED / DRAFT show an empty state; only DRAFT offers Publish.
export type PublicLinksState =
  | { mode: 'active'; notice?: { title: string; hint: string } }
  | { mode: 'info'; title: string; hint: string; showPublishButton: boolean };

export const derivePublicLinksState = (
  doc: DocumentDto,
  t: TFunction
): PublicLinksState => {
  if (doc.status === DocumentStatusEnum.ACTIVE) return { mode: 'active' };

  if (doc.status === DocumentStatusEnum.SCHEDULED) {
    const date = formatDateDisplay(doc.validFrom, '');
    return {
      mode: 'active',
      notice: {
        title: t('common:document_public_links_scheduled_title'),
        hint: date
          ? t('common:document_public_links_scheduled_hint', { date })
          : t('common:document_public_links_scheduled_hint_undated'),
      },
    };
  }

  if (doc.status === DocumentStatusEnum.EXPIRED) {
    const date = formatDateDisplay(doc.validTo, '');
    return {
      mode: 'info',
      title: t('common:document_public_links_expired_title'),
      hint: date
        ? t('common:document_public_links_expired_hint', { date })
        : t('common:document_public_links_expired_hint_undated'),
      showPublishButton: false,
    };
  }

  if (doc.status === DocumentStatusEnum.REVOKED) {
    return {
      mode: 'info',
      title: t('common:document_public_links_revoked_title'),
      hint: t('common:document_public_links_revoked_hint'),
      showPublishButton: false,
    };
  }

  // DRAFT (or unknown) — the only state with a Publish action.
  return {
    mode: 'info',
    title: t('common:document_public_links_unpublished'),
    hint: t('common:document_public_links_enable_hint'),
    showPublishButton: true,
  };
};
