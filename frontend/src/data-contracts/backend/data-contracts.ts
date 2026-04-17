/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface DocumentMetadataDto {
  key: string;
  value: string;
}

export interface DocumentResponsibilityDto {
  /**
   * @minLength 1
   * @maxLength 255
   */
  username: string;
}

export interface MetadataFilterDto {
  key?: string;
  matchesAny?: string[];
  matchesAll?: string[];
}

export interface DocumentFilterParametersDto {
  page?: number;
  limit?: number;
  sortBy?: string[];
  sortDirection?: DocumentFilterParametersDtoSortDirectionEnum;
  onlyLatestRevision?: boolean;
  createdBy?: string;
  documentTypes?: string[];
  metaData?: MetadataFilterDto[];
  /** @uniqueItems true */
  responsibilities?: DocumentResponsibilityDto[];
  /** @pattern \d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d.\d+Z? */
  validOn?: string;
}

export interface DocumentUpdateDto {
  updatedBy: string;
  description?: string;
  archive?: boolean;
  metadataList?: DocumentMetadataDto[];
  type?: string;
  /** @pattern \d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d.\d+Z? */
  validFrom?: string;
  /** @pattern \d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d.\d+Z? */
  validTo?: string;
}

export interface DocumentResponsibilitiesUpdateDto {
  /** @minLength 1 */
  changedBy: string;
  /** @uniqueItems true */
  responsibilities: DocumentResponsibilityDto[];
}

export interface DocumentTypeCreateDto {
  type: string;
  displayName: string;
  createdBy: string;
}

export interface DocumentTypeUpdateDto {
  type?: string;
  displayName?: string;
  updatedBy: string;
}

export interface DocumentDataDto {
  id: string;
  fileName: string;
  mimeType: string;
  fileSizeInBytes: number;
}

export interface DocumentDto {
  id: string;
  municipalityId: string;
  registrationNumber: string;
  revision: number;
  description: string;
  created: string;
  createdBy: string;
  updatedBy?: string;
  archive: boolean;
  metadataList: DocumentMetadataDto[];
  documentData: DocumentDataDto[];
  responsibilities?: DocumentResponsibilityDto[];
  type: string;
  validFrom?: string;
  validTo?: string;
}

export interface PageMetaDto {
  page: number;
  limit: number;
  count: number;
  totalRecords: number;
  totalPages: number;
}

export interface PagedDocumentResponseDto {
  documents: DocumentDto[];
  _meta: PageMetaDto;
}

export interface DocumentTypeDto {
  type: string;
  displayName: string;
}

export interface OrgNodeDto {
  orgId: number;
  orgName: string;
  parentId?: number;
  companyId?: number;
  treeLevel?: number;
  isLeafLevel?: boolean;
}

export interface OrgTreeDto {
  orgId: number;
  orgName: string;
  parentId?: number;
  companyId?: number;
  treeLevel?: number;
  isLeafLevel?: boolean;
  organizations?: OrgTreeDto[];
}

export interface DepartmentTeamDto {
  orgId: number;
  orgName: string;
  companyId?: number;
  parentId?: number;
}

export interface CompanyIdDto {
  companyId: string;
}

export interface LegalEntityIdDto {
  legalEntityId: string;
}

export interface PortalPersonDto {
  /** @format uuid */
  personid?: string;
  givenname?: string;
  lastname?: string;
  fullname?: string;
  email?: string;
  workPhone?: string;
  mobilePhone?: string;
  company?: string;
  companyId?: number;
  orgTree?: string;
  isManager?: boolean;
  loginName?: string;
}

export interface PermissionsDto {
  canManageDocuments: boolean;
  canManageDocumentTypes: boolean;
}

export interface UserDto {
  name: string;
  firstName: string;
  lastName: string;
  username: string;
  permissions: PermissionsDto;
}

export enum DocumentFilterParametersDtoSortDirectionEnum {
  ASC = "ASC",
  DESC = "DESC",
}
