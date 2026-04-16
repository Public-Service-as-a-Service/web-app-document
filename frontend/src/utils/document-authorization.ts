import type { Document } from '@interfaces/document.interface';
import type { User } from '@interfaces/user.interface';

// Mirrors the backend rule in backend/src/utils/document-authorization.ts:
//   admin  OR  no responsibilities assigned  OR  user is in the list.
// Used to hide edit affordances — the backend is the authoritative check.
export const canEditDocument = (
  user: Pick<User, 'username' | 'isAdmin'> | undefined,
  document: Pick<Document, 'responsibilities'> | null | undefined
): boolean => {
  if (!user || !document) return false;
  if (user.isAdmin) return true;

  const list = document.responsibilities || [];
  if (list.length === 0) return true;

  const username = user.username.trim().toLowerCase();
  return list.some((r) => r.username.toLowerCase() === username);
};
