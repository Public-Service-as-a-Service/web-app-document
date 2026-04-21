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
  personId: string;
  email: string;
  groups: string;
  role: InternalRole;
  permissions: Permissions;
}

export interface UserData {
  name: string;
  firstName: string;
  lastName: string;
  username: string;
  personId: string;
  permissions: Permissions;
}
