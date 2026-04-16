export interface CompanyId {
  companyId: string;
}

export interface LegalEntityId {
  legalEntityId: string;
}

export interface OrgNode {
  orgId: number;
  orgName: string;
  parentId?: number | null;
  companyId?: number;
  treeLevel?: number;
  isLeafLevel?: boolean;
}

export interface OrgTree {
  orgId: number;
  orgName: string;
  parentId?: number | null;
  companyId?: number;
  treeLevel?: number;
  isLeafLevel?: boolean;
  organizations?: OrgTree[];
}

export interface DepartmentTeam {
  orgId: number;
  orgName: string;
  companyId?: number;
  parentId?: number;
}
