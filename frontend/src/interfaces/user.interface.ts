export interface Permissions {
  canManageDocuments: boolean;
  canManageDocumentTypes: boolean;
}

export interface User {
  name: string;
  firstName: string;
  lastName: string;
  username: string;
  permissions: Permissions;
}
