/**
 * Frontend-only employee shapes. Upstream Swagger contracts live in the
 * backend (`backend/src/data-contracts/employee/data-contracts.ts`) and may
 * carry version suffixes — those suffixes are intentionally dropped here
 * because the frontend does not care which upstream API revision produced
 * the data, only about the fields it actually consumes.
 *
 * Keep this file narrow: only include the fields the UI reads today. Adding
 * fields speculatively makes refactors noisier when the upstream schema
 * changes.
 */

export interface Employment {
  /** ISO datetime, nullable when an open-ended engagement. */
  endDate?: string | null;
}

export interface Employee {
  givenname?: string | null;
  lastname?: string | null;
  employments?: Employment[] | null;
}
