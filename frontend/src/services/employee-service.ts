import type { PortalPersonDto } from '@data-contracts/backend/data-contracts';
import { apiService, ApiResponse } from './api-service';

const cache = new Map<string, PortalPersonDto>();
const inflight = new Map<string, Promise<PortalPersonDto>>();

const normalizeKey = (loginName: string): string => {
  const stripped = loginName.includes('\\') ? loginName.split('\\').pop() || '' : loginName;
  return stripped.trim().toUpperCase();
};

export const getEmployee = (loginName: string): Promise<PortalPersonDto> => {
  const key = normalizeKey(loginName);
  if (!key) {
    return Promise.reject(new Error('Invalid loginName'));
  }

  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);

  const existing = inflight.get(key);
  if (existing) return existing;

  const request = apiService
    .get<ApiResponse<PortalPersonDto>>(`employees/${encodeURIComponent(key)}`)
    .then((res) => {
      const data = res.data.data;
      cache.set(key, data);
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, request);
  return request;
};
