export const APIS = [
  {
    name: 'document',
    version: '3.0',
  },
  {
    name: 'company',
    version: '1.0',
  },
] as const;

/**
 * Returns the API path prefix for a given service.
 *
 * Override per service with `{NAME}_API_PREFIX` env var:
 *   - Unset  → default gateway prefix (`document/3.0`)
 *   - Empty  → no prefix (direct connection to microservice)
 *   - Custom → whatever value you set
 */
export const getApiBase = (name: string): string => {
  const envKey = `${name.toUpperCase()}_API_PREFIX`;
  const envValue = process.env[envKey];

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
 *   - `DOCUMENT_API_URL` → internal Docker URL (e.g. `http://api-service-document:8080`)
 *   - `COMPANY_API_URL`  → external WSO2 gateway (e.g. `https://api-test.sundsvall.se`)
 *   - Falls back to `API_BASE_URL`
 */
export const getServiceBaseUrl = (name: string): string => {
  const envKey = `${name.toUpperCase()}_API_URL`;
  return process.env[envKey] || process.env.API_BASE_URL || '';
};
