import { IsBoolean, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PermissionsDto {
  @IsBoolean()
  canManageDocuments!: boolean;

  @IsBoolean()
  canManageDocumentTypes!: boolean;
}

/**
 * Public shape of the authenticated user. Narrows the backend `User` interface
 * (which also includes email, groups, role) to the fields the frontend needs.
 */
export class UserDto {
  @IsString()
  name!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  username!: string;

  @ValidateNested()
  @Type(() => PermissionsDto)
  permissions!: PermissionsDto;
}
