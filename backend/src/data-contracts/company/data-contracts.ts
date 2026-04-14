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

export interface DepartmentTeamResult {
  /** @format int32 */
  orgId?: number;
  teamNames?: string[] | null;
}

export interface LoginName {
  domain?: string | null;
  loginName?: string | null;
}

export interface Organization {
  /** @format int32 */
  orgId?: number;
  orgName?: string | null;
  /** @format int32 */
  parentId?: number | null;
  isLeafLevel?: boolean;
  /** @format int32 */
  treeLevel?: number;
  responsibilityCode?: string | null;
  responsibilityCodePartList?: string | null;
  /** @format int32 */
  companyId?: number;
  municipalityId?: string | null;
}

export interface OrganizationTree {
  /** @format int32 */
  orgId?: number;
  /** @format int32 */
  treeLevel?: number;
  orgName?: string | null;
  /** @format int32 */
  parentId?: number;
  isLeafLevel?: boolean;
  /** @format int32 */
  companyId?: number;
  responsibilityCode?: string | null;
  responsibilityList?: string | null;
  organizations?: OrganizationTree[] | null;
}

export interface ProblemDetails {
  type?: string | null;
  title?: string | null;
  /** @format int32 */
  status?: number | null;
  detail?: string | null;
  instance?: string | null;
  [key: string]: any;
}
