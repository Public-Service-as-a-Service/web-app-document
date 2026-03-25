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
const postFormData = <T>(url: string, data: FormData, options?: { [key: string]: any }) => {
  return axios.post<T>(apiURL(url), data, { ...options });
};

export const apiService = { get, post, postFormData };
