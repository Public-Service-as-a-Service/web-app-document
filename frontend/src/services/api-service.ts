'use client';

import { apiURL } from '@utils/api-url';
import axios from 'axios';

export interface ApiResponse<T = unknown> {
  data: T;
  message: string;
}

const defaultOptions = {
  headers: {
    'Content-Type': 'application/json',
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const get = <T>(url: string, options?: { [key: string]: any }) =>
  axios.get<T>(apiURL(url), { ...defaultOptions, ...options });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const post = <T>(url: string, data: any, options?: { [key: string]: any }) => {
  return axios.post<T>(apiURL(url), data, { ...defaultOptions, ...options });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const put = <T>(url: string, data: any, options?: { [key: string]: any }) => {
  return axios.put<T>(apiURL(url), data, { ...defaultOptions, ...options });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const patch = <T>(url: string, data: any, options?: { [key: string]: any }) => {
  return axios.patch<T>(apiURL(url), data, { ...defaultOptions, ...options });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const del = <T>(url: string, options?: { [key: string]: any }) => {
  return axios.delete<T>(apiURL(url), { ...defaultOptions, ...options });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const postFormData = <T>(url: string, data: FormData, options?: { [key: string]: any }) => {
  return axios.post<T>(apiURL(url), data, { ...options });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const putFormData = <T>(url: string, data: FormData, options?: { [key: string]: any }) => {
  return axios.put<T>(apiURL(url), data, { ...options });
};

const getBlob = (url: string) => {
  return axios.get(apiURL(url), { responseType: 'blob' });
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
