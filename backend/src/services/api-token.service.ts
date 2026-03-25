import qs from 'qs';
import axios from 'axios';
import { CLIENT_KEY, CLIENT_SECRET } from '@config';
import { HttpException } from '@/exceptions/http.exception';
import { logger } from '@utils/logger';
import { API_BASE_URL } from '@config';

export interface Token {
  access_token: string;
  expires_in: number;
}

// NOTE: save token in memory only for now
let c_access_token = '';
let c_token_expires = 0;

class ApiTokenService {
  public async getToken(): Promise<string> {
    if (Date.now() >= c_token_expires) {
      logger.info('Getting oauth API token');
      await this.fetchToken();
    }
    return c_access_token;
  }

  public async setToken(token: Token) {
    c_access_token = token.access_token;
    // NOTE: Set timestamp for when we need to refresh minus 10 seconds for margin
    c_token_expires = Date.now() + (token.expires_in * 1000 - 10000);

    logger.info(`Token valid for: ${token.expires_in}`);
    logger.info(`Current time: ${new Date()}`);
    logger.info(`Token expires at: ${new Date(c_token_expires)}`);
  }

  public async fetchToken(): Promise<string> {
    const authString = Buffer.from(`${CLIENT_KEY}:${CLIENT_SECRET}`, 'utf-8').toString('base64');

    try {
      const { data } = await axios({
        timeout: 30000,
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + authString,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: qs.stringify({
          grant_type: 'client_credentials',
        }),
        url: `${API_BASE_URL}/token`,
      });
      const token = data as Token;

      if (!token) throw new HttpException(502, 'Bad Gateway');
      this.setToken(token);

      return this.getToken();
    } catch (error) {
      logger.error(`Failed to fetch JWT access token: ${JSON.stringify(error)}`);
      throw new HttpException(502, 'Bad Gateway');
    }
  }
}

export default ApiTokenService;
