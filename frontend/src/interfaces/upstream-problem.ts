// Structured error payload forwarded by the backend for 4xx responses.
// Mirrors the RFC 7807 problem+json fields whitelisted in the backend
// error middleware — keep in sync when adding fields there.

import type { AxiosError } from 'axios';

export interface UpstreamProblem {
  message: string;
  title?: string;
  detail?: string;
}

export const getProblemStatus = (error: unknown): number | undefined =>
  (error as AxiosError<UpstreamProblem> | undefined)?.response?.status;
