'use client';

import { apiURL } from '@utils/api-url';
import axios from 'axios';

export interface ApiResponse<T = unknown> {
  data: T;
  message: string;
}

const isTokenMode = process.env.NEXT_PUBLIC_AUTH_TYPE === 'token';

const getAuthHeaders = (): Record<string, string> => {
  if (isTokenMode && typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
};

const defaultOptions = {
  headers: {
    'Content-Type': 'application/json',
  },
};

const mergeOptions = (options?: { [key: string]: any }) => {
  const authHeaders = getAuthHeaders();
  return {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...authHeaders,
      ...options?.headers,
    },
  };
};

// 401 interceptor — redirect to login on auth failure
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error?.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !window.location.pathname.includes('/login')
    ) {
      if (isTokenMode) {
        localStorage.removeItem('access_token');
      }
      // Extract current locale from pathname (e.g., /sv/documents -> sv)
      const pathParts = window.location.pathname.replace(process.env.NEXT_PUBLIC_BASE_PATH || '', '').split('/').filter(Boolean);
      const locale = ['sv', 'en'].includes(pathParts[0]) ? pathParts[0] : 'sv';
      window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/${locale}/login?failMessage=NOT_AUTHORIZED`;
    }
    return Promise.reject(error);
  },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const get = <T>(url: string, options?: { [key: string]: any }) =>
  axios.get<T>(apiURL(url), mergeOptions(options));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const post = <T>(url: string, data: any, options?: { [key: string]: any }) => {
  return axios.post<T>(apiURL(url), data, mergeOptions(options));
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const put = <T>(url: string, data: any, options?: { [key: string]: any }) => {
  return axios.put<T>(apiURL(url), data, mergeOptions(options));
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const patch = <T>(url: string, data: any, options?: { [key: string]: any }) => {
  return axios.patch<T>(apiURL(url), data, mergeOptions(options));
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const del = <T>(url: string, options?: { [key: string]: any }) => {
  return axios.delete<T>(apiURL(url), mergeOptions(options));
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const postFormData = <T>(url: string, data: FormData, options?: { [key: string]: any }) => {
  const authHeaders = getAuthHeaders();
  return axios.post<T>(apiURL(url), data, { ...options, headers: { ...authHeaders, ...options?.headers } });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const putFormData = <T>(url: string, data: FormData, options?: { [key: string]: any }) => {
  const authHeaders = getAuthHeaders();
  return axios.put<T>(apiURL(url), data, { ...options, headers: { ...authHeaders, ...options?.headers } });
};

const getBlob = (url: string) => {
  const authHeaders = getAuthHeaders();
  return axios.get(apiURL(url), { responseType: 'blob', headers: authHeaders });
};

const realApiService = { get, post, put, patch, del, postFormData, putFormData, getBlob };

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

// Lazy-load mock service only when needed
const getMockService = async () => (await import('./mock-api-service')).mockApiService;

export const apiService: typeof realApiService = useMock
  ? new Proxy(realApiService, {
      get: (_target, prop: string) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (...args: any[]) => {
          const mock = await getMockService();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (mock as any)[prop](...args);
        },
    })
  : realApiService;
