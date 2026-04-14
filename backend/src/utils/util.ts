import { API_BASE_URL, BASE_URL_PREFIX, MUNICIPALITY_ID } from '@config';
import { getApiBase, getServiceBaseUrl } from '@config/api-config';

export const apiURL = (...parts: string[]): string => {
  const first = parts[0] || '';
  // Already absolute — don't prepend API_BASE_URL
  if (first.startsWith('http://') || first.startsWith('https://')) {
    return parts.map((p) => p?.replace(/(^\/|\/+$)/g, '')).join('/');
  }
  const urlParts = [API_BASE_URL, ...parts];
  return urlParts.map((p) => p?.replace(/(^\/|\/+$)/g, '')).join('/');
};

export const serviceApiURL = (service: string, ...parts: string[]): string => {
  const baseUrl = getServiceBaseUrl(service);
  const apiBase = getApiBase(service);
  const mid = MUNICIPALITY_ID || '2281';
  const urlParts = [baseUrl, apiBase, mid, ...parts]
    .map((p) => p?.replace(/(^\/|\/+$)/g, ''))
    .filter(Boolean);
  return urlParts.join('/');
};

export const municipalityApiURL = (...parts: string[]): string =>
  serviceApiURL('document', ...parts);

export const localApi = (...parts: string[]): string => {
  const urlParts = [BASE_URL_PREFIX, ...parts];
  return urlParts.map((pathPart) => pathPart?.replace(/(\/+$)/g, '')).join('/');
};
