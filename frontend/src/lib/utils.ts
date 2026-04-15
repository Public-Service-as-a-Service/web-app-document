import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Returns a CSS-identifier-safe string for use as a <ViewTransition name>.
// Replaces any non-alphanumeric character (other than `_` and `-`) with `_`
// so registration numbers like "REG-2024/123" become valid VT names.
export function sanitizeVTName(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_');
}
