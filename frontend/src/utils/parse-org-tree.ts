/**
 * Parse the upstream `orgTree` string from `PortalPersonDto`.
 *
 * Format (delimiter is U+00A4 CURRENCY SIGN):
 *   `2|28|Kommunstyrelsekontoret¤3|440|KSK Avdelningar¤4|2835|KSK AVD Digital Transformation`
 *
 * Each segment is `level|orgId|name`. The deepest segment is the user's most
 * specific org placement (typically their department).
 */

export interface OrgTreeSegment {
  level: number;
  orgId: number;
  orgName: string;
}

const ORG_TREE_DELIMITER = '\u00a4';

export const parseOrgTree = (orgTree: string | null | undefined): OrgTreeSegment[] => {
  if (!orgTree) return [];
  return orgTree
    .split(ORG_TREE_DELIMITER)
    .map((segment) => segment.split('|'))
    .filter((parts) => parts.length >= 3)
    .map((parts) => ({
      level: Number(parts[0]),
      orgId: Number(parts[1]),
      // Names theoretically could contain a literal '|' — preserve them by
      // re-joining anything past the first two pipe-separated tokens.
      orgName: parts.slice(2).join('|').trim(),
    }))
    .filter((seg) => Number.isFinite(seg.level) && Number.isFinite(seg.orgId) && seg.orgName);
};

export const getDeepestOrgSegment = (
  orgTree: string | null | undefined
): OrgTreeSegment | null => {
  const segments = parseOrgTree(orgTree);
  if (segments.length === 0) return null;
  return segments.reduce((deepest, seg) => (seg.level > deepest.level ? seg : deepest));
};
