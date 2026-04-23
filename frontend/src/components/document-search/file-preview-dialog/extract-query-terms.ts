/**
 * Turn the URL-state search query into literal terms a DOM walker can match
 * against. Phrase-quoting and boolean operators aren't supported yet — they
 * just fall through as bare words, which is still useful feedback in the
 * preview even if it's not semantically exact.
 *
 * Elasticsearch wildcard asterisks (`*term*`) are stripped because they would
 * turn into `.*` inside a regex and greedy-match the whole document.
 */
export function extractQueryTerms(rawQueries: readonly string[] | undefined): string[] {
  if (!rawQueries?.length) return [];
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const raw of rawQueries) {
    if (!raw) continue;
    for (const piece of raw.split(/\s+/)) {
      const cleaned = piece.replace(/\*/g, '').trim();
      if (cleaned.length < 2) continue;
      const key = cleaned.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      terms.push(cleaned);
    }
  }
  // Longest first so regex alternation prefers "kommun" over "kom" when both
  // are searched — otherwise only the shorter prefix would get marked.
  return terms.sort((a, b) => b.length - a.length);
}
