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
}

export interface DocumentUpdateDto {
  createdBy: string;
  description?: string;
  archive?: boolean;
  metadataList?: DocumentMetadataDto[];
  type?: string;
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

export enum DocumentFilterParametersDtoSortDirectionEnum {
  ASC = "ASC",
  DESC = "DESC",
}
