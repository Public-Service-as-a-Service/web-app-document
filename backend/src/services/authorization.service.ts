import { AUTHORIZED_GROUPS, ADMIN_GROUP, USER_GROUP } from '@config';
import { InternalRole, Permissions } from '../interfaces/user.interface';
import { logger } from '@utils/logger';

export const defaultPermissions = (): Permissions => ({
  canManageDocuments: false,
  canManageDocumentTypes: false,
});

const rolePermissions: Record<InternalRole, Partial<Permissions>> = {
  document_admin: {
    canManageDocuments: true,
    canManageDocumentTypes: true,
  },
  document_user: {
    canManageDocuments: true,
  },
};

export function authorizeGroups(groups: string): boolean {
  if (!AUTHORIZED_GROUPS) {
    logger.warn('AUTHORIZED_GROUPS is not configured — denying all');
    return false;
  }

  const authorizedGroupsList = AUTHORIZED_GROUPS.split(',').map((g) => g.trim().toLowerCase());
  const userGroups = groups.split(',').map((g) => g.trim().toLowerCase());

  return authorizedGroupsList.some((authorizedGroup) => userGroups.includes(authorizedGroup));
}

export function getRole(groups: string): InternalRole {
  const userGroups = groups.split(',').map((g) => g.trim().toLowerCase());

  if (ADMIN_GROUP && userGroups.includes(ADMIN_GROUP.toLowerCase())) {
    return 'document_admin';
  }

  if (USER_GROUP && userGroups.includes(USER_GROUP.toLowerCase())) {
    return 'document_user';
  }

  return 'document_user';
}

export function getPermissions(groups: string): Permissions {
  const role = getRole(groups);
  const permissions = defaultPermissions();

  const rolePerms = rolePermissions[role];
  if (rolePerms) {
    Object.assign(permissions, rolePerms);
  }

  return permissions;
}
