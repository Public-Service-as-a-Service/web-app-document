export interface Permissions {
  canManageDocuments: boolean;
  canManageDocumentTypes: boolean;
}

export type InternalRole = 'document_admin' | 'document_user';

export interface User {
  name: string;
  firstName: string;
  lastName: string;
  username: string;
  role: InternalRole;
  isAdmin: boolean;
  permissions: Permissions;
}
