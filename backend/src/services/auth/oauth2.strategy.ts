import qs from 'qs';
import axios from 'axios';
import { API_BASE_URL, CLIENT_KEY, CLIENT_SECRET } from '@config';
import { HttpException } from '@/exceptions/http.exception';
import { logger } from '@utils/logger';
import type { AuthStrategy } from './auth.strategy';

interface Token {
  access_token: string;
  expires_in: number;
}

let cachedToken = '';
let tokenExpiresAt = 0;

export class OAuth2Strategy implements AuthStrategy {
  public async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    return { Authorization: `Bearer ${token}` };
  }

  private async getToken(): Promise<string> {
    if (Date.now() >= tokenExpiresAt) {
      logger.info('Refreshing OAuth2 token');
      await this.fetchToken();
    }
    return cachedToken;
  }

  private async fetchToken(): Promise<void> {
    const authString = Buffer.from(`${CLIENT_KEY}:${CLIENT_SECRET}`, 'utf-8').toString('base64');

    try {
      const { data } = await axios({
        timeout: 30000,
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + authString,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: qs.stringify({ grant_type: 'client_credentials' }),
        url: `${API_BASE_URL}/token`,
      });

      const token = data as Token;
      if (!token) throw new HttpException(502, 'Bad Gateway');

      cachedToken = token.access_token;
      tokenExpiresAt = Date.now() + (token.expires_in * 1000 - 10000);

      logger.info(
        `OAuth2 token valid for ${token.expires_in}s, expires at ${new Date(tokenExpiresAt).toISOString()}`
      );
    } catch (error) {
      logger.error(`Failed to fetch OAuth2 token: ${JSON.stringify(error)}`);
      throw new HttpException(502, 'Bad Gateway');
    }
  }
}
