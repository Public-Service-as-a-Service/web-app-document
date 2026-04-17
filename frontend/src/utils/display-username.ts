/**
 * Strip any AD-style domain prefix from a stored username so the UI shows
 * the bare loginName segment (e.g. `personal\edw25mol` → `edw25mol`).
 */
export const displayUsername = (raw: string | null | undefined): string => {
  if (!raw) return '';
  const idx = raw.lastIndexOf('\\');
  return idx >= 0 ? raw.slice(idx + 1) : raw;
};
