import type { PortalPersonDto } from '@data-contracts/backend/data-contracts';
import { apiService, ApiResponse } from './api-service';

const cache = new Map<string, PortalPersonDto>();
const inflight = new Map<string, Promise<PortalPersonDto>>();

const normalizeKey = (loginName: string): string => {
  const stripped = loginName.includes('\\') ? loginName.split('\\').pop() || '' : loginName;
  return stripped.trim().toUpperCase();
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const normalizePersonId = (personId: string): string => personId.trim().toLowerCase();

const cacheResult = (key: string, data: PortalPersonDto): PortalPersonDto => {
  cache.set(key, data);
  if (data.loginName) {
    cache.set(normalizeKey(data.loginName), data);
  }
  if (data.personid) {
    cache.set(`personid:${normalizePersonId(data.personid)}`, data);
  }
  return data;
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
    .then((res) => cacheResult(key, res.data.data))
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, request);
  return request;
};

export const getEmployeeByPersonId = (personId: string): Promise<PortalPersonDto> => {
  const key = normalizePersonId(personId);
  if (!key) {
    return Promise.reject(new Error('Invalid personId'));
  }

  const cacheKey = `personid:${key}`;
  const cached = cache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  const existing = inflight.get(cacheKey);
  if (existing) return existing;

  const request = apiService
    .get<ApiResponse<PortalPersonDto>>(`employees/by-personid/${encodeURIComponent(key)}`)
    .then((res) => cacheResult(cacheKey, res.data.data))
    .finally(() => {
      inflight.delete(cacheKey);
    });

  inflight.set(cacheKey, request);
  return request;
};

export const getEmployeeByEmail = (email: string): Promise<PortalPersonDto> => {
  const key = normalizeEmail(email);
  if (!key) {
    return Promise.reject(new Error('Invalid email'));
  }

  const cacheKey = `email:${key}`;
  const cached = cache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  const existing = inflight.get(cacheKey);
  if (existing) return existing;

  const request = apiService
    .get<ApiResponse<PortalPersonDto>>(`employees/by-email/${encodeURIComponent(key)}`)
    .then((res) => cacheResult(cacheKey, res.data.data))
    .finally(() => {
      inflight.delete(cacheKey);
    });

  inflight.set(cacheKey, request);
  return request;
};
