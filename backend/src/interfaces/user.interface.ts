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
  email: string;
  groups: string;
  role: InternalRole;
  isAdmin: boolean;
  permissions: Permissions;
}

export interface UserData {
  name: string;
  firstName: string;
  lastName: string;
  username: string;
  role: InternalRole;
  isAdmin: boolean;
  permissions: Permissions;
}

export const isAdminRole = (role: InternalRole): boolean => role === 'document_admin';
