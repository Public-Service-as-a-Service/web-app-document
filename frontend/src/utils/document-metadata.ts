type MetadataItem = { key: string; value: string };

export const METADATA_KEYS = {
  caseNumber: 'caseNumber',
  caseUrl: 'caseUrl',
  departmentOrgId: 'departmentOrgId',
  departmentOrgName: 'departmentOrgName',
} as const;

export type MetadataKey = (typeof METADATA_KEYS)[keyof typeof METADATA_KEYS];

// User-facing metadata keys that need a localized label on the public
// document view. Internal keys (e.g. departmentOrgId) stay off this list
// because they're filtered out before display.
export const PUBLIC_METADATA_KEYS = [
  METADATA_KEYS.caseNumber,
  METADATA_KEYS.caseUrl,
  METADATA_KEYS.departmentOrgName,
] as const;

export type PublicMetadataKey = (typeof PUBLIC_METADATA_KEYS)[number];

// Strict record so adding a new public key forces both locales to provide
// a label — missing entries become a TS error at the labels literal, not
// a silent fallback to the raw key in the UI.
export type MetadataLabels = Record<PublicMetadataKey, string>;

// Safe lookup that confines the string→PublicMetadataKey cast to one place.
export const getMetadataLabel = (labels: MetadataLabels, key: string): string | undefined =>
  labels[key as PublicMetadataKey];

// Keys whose values are expected to hold a URL — used by both validation
// and rendering so the two never disagree on what counts as a link.
const URL_METADATA_KEYS = new Set<string>([METADATA_KEYS.caseUrl]);

export const isUrlMetadataKey = (key: string): boolean => URL_METADATA_KEYS.has(key);

// Single source for what a "valid metadata URL" looks like — shared by the
// Zod schema, the edit-flow guard, and the public view's auto-link.
export const HTTP_URL_PATTERN = /^https?:\/\/\S+/i;

export const isValidUrl = (value: string): boolean => HTTP_URL_PATTERN.test(value);

const INTERNAL_SUFFIXES = ['Id', 'ID', '-id', '-ID', '_id', '_ID'];

const INTERNAL_KEYS = new Set<string>([
  METADATA_KEYS.departmentOrgId,
  'organizationId',
  'organisationsId',
  'ORGANISATIONS-ID',
]);

export const isInternalMetadataKey = (key: string | null | undefined): boolean => {
  if (!key) return true;
  if (INTERNAL_KEYS.has(key)) return true;
  return INTERNAL_SUFFIXES.some((suffix) => key.endsWith(suffix));
};

export const visibleNonEmptyMetadata = <T extends MetadataItem>(items: T[] | undefined): T[] => {
  if (!items?.length) return [];
  return items.filter((item) => !isInternalMetadataKey(item.key) && item.value.trim() !== '');
};

export const getMetadataValue = (items: MetadataItem[] | undefined, key: string): string =>
  items?.find((m) => m.key === key)?.value ?? '';
