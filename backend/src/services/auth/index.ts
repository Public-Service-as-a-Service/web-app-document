import { AUTH_MODE } from '@config';
import { logger } from '@utils/logger';
import type { AuthStrategy } from './auth.strategy';
import { NoneStrategy } from './none.strategy';
import { OAuth2Strategy } from './oauth2.strategy';

export type { AuthStrategy } from './auth.strategy';

export function createAuthStrategy(): AuthStrategy {
  switch (AUTH_MODE) {
    case 'none':
      logger.info('API auth mode: none (no authentication)');
      return new NoneStrategy();
    case 'oauth2':
    default:
      logger.info('API auth mode: oauth2');
      return new OAuth2Strategy();
  }
}
