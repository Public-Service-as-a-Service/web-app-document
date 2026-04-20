import type { UserDto, PermissionsDto } from '@data-contracts/backend/data-contracts';
import { apiService, ApiResponse } from './api-service';

export const defaultPermissions: PermissionsDto = {
  canManageDocuments: false,
  canManageDocumentTypes: false,
};

export const emptyUser: UserDto = {
  name: '',
  firstName: '',
  lastName: '',
  username: '',
  personId: '',
  permissions: { ...defaultPermissions },
};

export const getMe = (): Promise<UserDto> => {
  return apiService
    .get<ApiResponse<UserDto>>('me')
    .then((res) => res.data.data)
    .catch((err) => Promise.reject(err.response?.data?.message));
};
