import { API_BASE_URL, BASE_URL_PREFIX, MUNICIPALITY_ID } from '@config';
import { getApiBase } from '@config/api-config';

export const apiURL = (...parts: string[]): string => {
  const urlParts = [API_BASE_URL, ...parts];
  return urlParts.map(pathPart => pathPart?.replace(/(^\/|\/+$)/g, '')).join('/');
};

export const municipalityApiURL = (...parts: string[]): string => {
  const apiBase = getApiBase('document');
  const mid = MUNICIPALITY_ID || '2281';
  const urlParts = [apiBase, mid, ...parts];
  return urlParts.map(pathPart => pathPart?.replace(/(^\/|\/+$)/g, '')).join('/');
};

export const localApi = (...parts: string[]): string => {
  const urlParts = [BASE_URL_PREFIX, ...parts];
  return urlParts.map(pathPart => pathPart?.replace(/(\/+$)/g, '')).join('/');
};
