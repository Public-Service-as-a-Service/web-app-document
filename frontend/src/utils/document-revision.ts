// Revisions are 0-based in the API (revision 0 = first revision) but are shown
// to users as 1-based so "revision 1" matches the first version of a document.
// Use `toDisplayRevision` for rendering and URL construction; use
// `fromDisplayRevision` when turning a display value from the URL back into
// the raw API number.
export const toDisplayRevision = (revision: number): number => revision + 1;

export const fromDisplayRevision = (display: number): number => display - 1;
