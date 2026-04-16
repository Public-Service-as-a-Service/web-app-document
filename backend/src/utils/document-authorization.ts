import { HttpException } from '@exceptions/http.exception';
import type { User } from '@/interfaces/user.interface';
import type { Document, DocumentResponsibility } from '@/interfaces/document.interface';

// Edit rules:
//   1. Admins (`role === 'document_admin'`) can always edit.
//   2. If the document has no responsibilities assigned, editing is open to
//      any authenticated user with write permission. This keeps legacy
//      documents (created before the responsibility feature) accessible.
//   3. Otherwise, the user must appear in `responsibilities` by username
//      (usernames are stored lowercased upstream; we compare lowercased here).
export const canEditDocument = (
  user: User | undefined,
  document: Pick<Document, 'responsibilities'>
): boolean => {
  if (!user) return false;
  if (user.isAdmin) return true;

  const list: DocumentResponsibility[] = document.responsibilities || [];
  if (list.length === 0) return true;

  const username = user.username.trim().toLowerCase();
  return list.some((r) => r.username.toLowerCase() === username);
};

export const assertCanEditDocument = (
  user: User | undefined,
  document: Pick<Document, 'responsibilities'>
): void => {
  if (!canEditDocument(user, document)) {
    throw new HttpException(403, 'Forbidden');
  }
};
