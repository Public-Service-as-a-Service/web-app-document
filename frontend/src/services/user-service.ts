import type { User, Permissions } from '@interfaces/user.interface';
import { apiService, ApiResponse } from './api-service';

export const defaultPermissions: Permissions = {
  canManageDocuments: false,
  canManageDocumentTypes: false,
};

export const emptyUser: User = {
  name: '',
  firstName: '',
  lastName: '',
  username: '',
  role: 'document_user',
  isAdmin: false,
  permissions: { ...defaultPermissions },
};

export const getMe = (): Promise<User> => {
  return apiService
    .get<ApiResponse<User>>('me')
    .then((res) => res.data.data)
    .catch((err) => Promise.reject(err.response?.data?.message));
};
