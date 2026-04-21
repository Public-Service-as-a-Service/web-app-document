import { User } from '../interfaces/user.interface';

export const mockUsers: User[] = [
  {
    name: 'Martin Hansson',
    firstName: 'Martin',
    lastName: 'Hansson',
    username: 'mar14han',
    personId: '97edca90-7fa8-457e-8223-aa078055465c',
    email: 'martin.hansson@sundsvall.se',
    groups: 'sg_document_admin,sg_document_user',
    role: 'document_admin',
    permissions: {
      canManageDocuments: true,
      canManageDocumentTypes: true,
    },
  },
  {
    name: 'Edwin Molina',
    firstName: 'Edwin',
    lastName: 'Molina',
    username: 'edw25mol',
    personId: '2ea5ebe4-dc69-497b-89c6-9013724b19b8',
    email: 'edwin.molina@sundsvall.se',
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
