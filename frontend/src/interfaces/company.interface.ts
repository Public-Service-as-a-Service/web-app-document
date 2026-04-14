export interface OrgNode {
  orgId: number;
  orgName: string;
  parentId?: number;
  companyId?: number;
  treeLevel?: number;
  isLeafNode?: boolean;
}

export interface OrgTree {
  orgId: number;
  orgName: string;
  parentId?: number;
  companyId?: number;
  treeLevel?: number;
  isLeafNode?: boolean;
  children?: OrgTree[];
}

export interface DepartmentTeam {
  orgId: number;
  orgName: string;
  companyId?: number;
  parentId?: number;
}
