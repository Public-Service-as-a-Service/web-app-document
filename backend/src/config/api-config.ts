export const APIS = [
  {
    name: 'document',
    version: '3.0',
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
