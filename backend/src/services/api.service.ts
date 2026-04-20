import { HttpException } from '@/exceptions/http.exception';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { createAuthStrategy, type AuthStrategy } from './auth';
import { v4 as uuidv4 } from 'uuid';

export interface ApiResponse<T> {
  data: T;
  message: string;
  headers?: Record<string, string>;
}

class ApiService {
  private authStrategy: AuthStrategy = createAuthStrategy();

  private getStatusMessage(status: number): string {
    if (status === 404) {
      return 'Not found';
    }

    if (status >= 400 && status < 500) {
      return 'Request to upstream API failed';
    }

    return 'Upstream API is unavailable';
  }

  private async getDefaultHeaders(
    extraHeaders?: Record<string, string>
  ): Promise<Record<string, string>> {
    const authHeaders = await this.authStrategy.getHeaders();
    return {
      ...authHeaders,
      'Content-Type': 'application/json',
      'X-Request-Id': uuidv4(),
      'X-Sent-By': 'document-app',
      ...extraHeaders,
    };
  }

  private async request<T>(
    config: AxiosRequestConfig,
    isRetry = false
  ): Promise<ApiResponse<T>> {
    const defaultHeaders = await this.getDefaultHeaders(config.headers as Record<string, string>);

    const preparedConfig: AxiosRequestConfig = {
      ...config,
      headers: defaultHeaders,
      url: config.baseURL ? config.url : apiURL(config.url || ''),
      timeout: config.timeout ?? 30000,
    };

    try {
      if (process.env.NODE_ENV === 'development') {
        logger.info(`API request [${preparedConfig.method}]: ${preparedConfig.url}`);
        logger.info(`x-request-id: ${defaultHeaders['X-Request-Id']}`);
      }
      const res = await axios(preparedConfig);
      return {
        data: res.data,
        message: 'success',
        headers: res.headers as Record<string, string>,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status) {
        const status = error.response.status;
        logger.error(`ERROR: API request failed with status: ${status}`);
        logger.error(`Error details: ${JSON.stringify(error.response.data).slice(0, 500)}`);

        // Upstream rejected our cached credentials (revoked/rotated token).
        // Drop the cache and retry once with fresh credentials before giving up.
        if (status === 401 && !isRetry) {
          logger.warn('Upstream returned 401 — invalidating auth cache and retrying once');
          this.authStrategy.invalidate();
          return this.request<T>(config, true);
        }

        const mappedStatus = status >= 500 ? 502 : status;
        throw new HttpException(mappedStatus, this.getStatusMessage(status), error.response.data);
      }

      logger.error(`Unknown error: ${JSON.stringify(error).slice(0, 150)}`);
      throw new HttpException(502, 'Upstream API is unavailable');
    }
  }

  public async getRaw(config: AxiosRequestConfig): Promise<AxiosResponse> {
    const defaultHeaders = await this.getDefaultHeaders();
    delete defaultHeaders['Content-Type'];

    const preparedConfig: AxiosRequestConfig = {
      ...config,
      method: 'GET',
      headers: { ...defaultHeaders, ...config.headers },
      url: config.baseURL ? config.url : apiURL(config.url || ''),
      timeout: config.timeout ?? 30000,
      responseType: 'stream',
    };

    try {
      if (process.env.NODE_ENV === 'development') {
        logger.info(`API raw request [GET]: ${preparedConfig.url}`);
      }
      return await axios(preparedConfig);
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status) {
        const status = error.response.status;
        const mappedStatus = status >= 500 ? 502 : status;
        throw new HttpException(mappedStatus, this.getStatusMessage(status));
      }
      throw new HttpException(502, 'Upstream API is unavailable');
    }
  }

  public async postMultipart<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const headers = { 'Content-Type': undefined as unknown as string };
    return this.request<T>({ ...config, method: 'POST', headers });
  }

  public async putMultipart<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const headers = { 'Content-Type': undefined as unknown as string };
    return this.request<T>({ ...config, method: 'PUT', headers });
  }

  public async get<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'GET' });
  }

  public async post<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'POST' });
  }

  public async put<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT' });
  }

  public async patch<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH' });
  }

  public async delete<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE' });
  }
}

export default ApiService;
