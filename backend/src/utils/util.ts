import { API_BASE_URL, BASE_URL_PREFIX } from '@config';

export const apiURL = (...parts: string[]): string => {
  const urlParts = [API_BASE_URL, ...parts];
  return urlParts.map(pathPart => pathPart?.replace(/(^\/|\/+$)/g, '')).join('/');
};

export const localApi = (...parts: string[]): string => {
  const urlParts = [BASE_URL_PREFIX, ...parts];
  return urlParts.map(pathPart => pathPart?.replace(/(\/+$)/g, '')).join('/');
};
