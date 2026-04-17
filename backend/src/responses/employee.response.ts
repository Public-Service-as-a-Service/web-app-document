import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import type { PortalPersonData } from '@/data-contracts/employee/data-contracts';

/**
 * Public-facing shape of a Sundsvalls kommun employee.
 *
 * Narrows upstream `PortalPersonData` to the fields that are safe and useful
 * for the frontend. Address/postal fields, referenceNumber, fullOrgTree etc.
 * are intentionally omitted — see `mapPortalPersonDataToDto`.
 */
export class PortalPersonDto implements Partial<PortalPersonData> {
  @IsUUID()
  @IsOptional()
  personid?: string;

  @IsString()
  @IsOptional()
  givenname?: string;

  @IsString()
  @IsOptional()
  lastname?: string;

  @IsString()
  @IsOptional()
  fullname?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  workPhone?: string;

  @IsString()
  @IsOptional()
  mobilePhone?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsNumber()
  @IsOptional()
  companyId?: number;

  @IsString()
  @IsOptional()
  orgTree?: string;

  @IsBoolean()
  @IsOptional()
  isManager?: boolean;

  @IsString()
  @IsOptional()
  loginName?: string;
}
