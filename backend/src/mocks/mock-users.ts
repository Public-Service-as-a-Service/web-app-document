import { User } from '../interfaces/user.interface';

export const mockUsers: User[] = [
  {
    name: 'Anna Andersson',
    firstName: 'Anna',
    lastName: 'Andersson',
    username: 'annand',
    email: 'anna.andersson@sundsvall.se',
    groups: 'sg_document_admin,sg_document_user',
    role: 'document_admin',
    permissions: {
      canManageDocuments: true,
      canManageDocumentTypes: true,
    },
  },
  {
    name: 'Erik Svensson',
    firstName: 'Erik',
    lastName: 'Svensson',
    username: 'eriksv',
    email: 'erik.svensson@sundsvall.se',
    groups: 'sg_document_user',
    role: 'document_user',
    permissions: {
      canManageDocuments: true,
      canManageDocumentTypes: false,
    },
  },
  {
    name: 'Maria Lindberg',
    firstName: 'Maria',
    lastName: 'Lindberg',
    username: 'marili',
    email: 'maria.lindberg@sundsvall.se',
    groups: 'sg_document_admin,sg_document_user',
    role: 'document_admin',
    permissions: {
      canManageDocuments: true,
      canManageDocumentTypes: true,
    },
  },
  {
    name: 'Johan Nilsson',
    firstName: 'Johan',
    lastName: 'Nilsson',
    username: 'johnil',
    email: 'johan.nilsson@sundsvall.se',
    groups: 'sg_document_user',
    role: 'document_user',
    permissions: {
      canManageDocuments: true,
      canManageDocumentTypes: false,
    },
  },
];

export function getMockUser(username: string): User | undefined {
  return mockUsers.find((u) => u.username === username);
}
