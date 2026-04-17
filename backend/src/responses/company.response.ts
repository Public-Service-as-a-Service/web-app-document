import { IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { Organization, OrganizationTree } from '@/data-contracts/company/data-contracts';

/**
 * Flat organization node. Narrows upstream `Organization` — upstream marks orgId/orgName
 * as optional but frontend treats them as required (no null checks at call sites).
 */
export class OrgNodeDto implements Partial<Organization> {
  @IsNumber()
  orgId!: number;

  @IsString()
  orgName!: string;

  @IsOptional()
  @IsNumber()
  parentId?: number | null;

  @IsOptional()
  @IsNumber()
  companyId?: number;

  @IsOptional()
  @IsNumber()
  treeLevel?: number;

  @IsOptional()
  @IsBoolean()
  isLeafLevel?: boolean;
}

/**
 * Recursive organization tree. Same base as OrgNodeDto plus nested children.
 * Upstream `OrganizationTree.parentId` is non-nullable (unlike flat Organization).
 */
export class OrgTreeDto implements Partial<OrganizationTree> {
  @IsNumber()
  orgId!: number;

  @IsString()
  orgName!: string;

  @IsOptional()
  @IsNumber()
  parentId?: number;

  @IsOptional()
  @IsNumber()
  companyId?: number;

  @IsOptional()
  @IsNumber()
  treeLevel?: number;

  @IsOptional()
  @IsBoolean()
  isLeafLevel?: boolean;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrgTreeDto)
  organizations?: OrgTreeDto[];
}

export class DepartmentTeamDto {
  @IsNumber()
  orgId!: number;

  @IsString()
  orgName!: string;

  @IsOptional()
  @IsNumber()
  companyId?: number;

  @IsOptional()
  @IsNumber()
  parentId?: number;
}

export class CompanyIdDto {
  @IsString()
  companyId!: string;
}

export class LegalEntityIdDto {
  @IsString()
  legalEntityId!: string;
}
