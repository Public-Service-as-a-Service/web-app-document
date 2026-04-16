// Revisions are 0-based in the API (revision 0 = first revision) but are shown
// to users as 1-based so "revision 1" matches the first version of a document.
// Use this only for rendering — API calls and route params must keep the raw value.
export const toDisplayRevision = (revision: number): number => revision + 1;
