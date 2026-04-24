export const APIS = [
  {
    name: 'document',
    version: '3.1',
  },
  {
    name: 'company',
    version: '1.0',
  },
  {
    name: 'employee',
    version: '2.0',
  },
  {
    name: 'eneo-sundsvall',
    version: '1.2',
  },
] as const;

// Env-var names can't carry hyphens on most shells, so service names with
// hyphens (e.g. `eneo-sundsvall`) get flattened to underscores for the
// lookup key: ENEO_SUNDSVALL_API_URL / ENEO_SUNDSVALL_API_PREFIX.
const envKey = (name: string, suffix: 'API_URL' | 'API_PREFIX'): string =>
  `${name.toUpperCase().replace(/-/g, '_')}_${suffix}`;

/**
 * Returns the API path prefix for a given service.
 *
 * Override per service with `{NAME}_API_PREFIX` env var:
 *   - Unset  → default gateway prefix (`document/3.0`)
 *   - Empty  → no prefix (direct connection to microservice)
 *   - Custom → whatever value you set
 */
export const getApiBase = (name: string): string => {
  const envValue = process.env[envKey(name, 'API_PREFIX')];

  if (envValue !== undefined) {
    return envValue;
  }

  const api = APIS.find((api) => api.name === name);
  return api ? `${api.name}/${api.version}` : name;
};

/**
 * Returns the base URL for a given service.
 *
 * Override per service with `{NAME}_API_URL` env var:
 *   - `DOCUMENT_API_URL`         → internal Docker URL (e.g. `http://api-service-document:8080`)
 *   - `COMPANY_API_URL`          → external WSO2 gateway (e.g. `https://api-test.sundsvall.se`)
 *   - `ENEO_SUNDSVALL_API_URL`   → WSO2 gateway hosting Eneo (hyphens in name → underscores)
 *   - Falls back to `API_BASE_URL`
 */
export const getServiceBaseUrl = (name: string): string => {
  return process.env[envKey(name, 'API_URL')] || process.env.API_BASE_URL || '';
};
