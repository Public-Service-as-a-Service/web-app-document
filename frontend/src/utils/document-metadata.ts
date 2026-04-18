type MetadataItem = { key: string; value: string };

const INTERNAL_SUFFIXES = ['Id', 'ID', '-id', '-ID', '_id', '_ID'];

const INTERNAL_KEYS = new Set([
  'departmentOrgId',
  'organizationId',
  'organisationsId',
  'ORGANISATIONS-ID',
]);

const FRIENDLY_LABELS: Record<string, { sv: string; en: string }> = {
  department: { sv: 'Avdelning', en: 'Department' },
  departmentOrgName: { sv: 'Avdelning', en: 'Department' },
};

export const isInternalMetadataKey = (key: string | null | undefined): boolean => {
  if (!key) return true;
  if (INTERNAL_KEYS.has(key)) return true;
  return INTERNAL_SUFFIXES.some((suffix) => key.endsWith(suffix));
};

export const visibleMetadata = <T extends MetadataItem>(items: T[] | undefined): T[] => {
  if (!items?.length) return [];
  return items.filter((item) => !isInternalMetadataKey(item.key));
};

export const friendlyMetadataLabel = (
  key: string,
  locale: 'sv' | 'en' = 'sv'
): string => {
  const entry = FRIENDLY_LABELS[key];
  if (entry) return entry[locale];
  return key;
};
