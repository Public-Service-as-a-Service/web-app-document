import { User } from '../interfaces/user.interface';

export const mockUsers: User[] = [
  {
    name: 'Anna Andersson',
    firstName: 'Anna',
    lastName: 'Andersson',
    username: 'annand',
    personId: '11111111-1111-1111-1111-111111111111',
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
    personId: '22222222-2222-2222-2222-222222222222',
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
    personId: '33333333-3333-3333-3333-333333333333',
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
    personId: '44444444-4444-4444-4444-444444444444',
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
