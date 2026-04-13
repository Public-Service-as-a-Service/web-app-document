import { NextFunction, Request, Response } from 'express';
import { HttpException } from '@exceptions/http.exception';
import { AUTH_TYPE, ACCESS_TOKEN } from '@config';
import { User } from '../interfaces/user.interface';

const tokenUser: User = {
  name: 'Token User',
  firstName: 'Token',
  lastName: 'User',
  username: 'token-user',
  email: 'token@test.local',
  groups: '',
  role: 'document_admin',
  permissions: {
    canManageDocuments: true,
    canManageDocumentTypes: true,
  },
};

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (AUTH_TYPE === 'token') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new HttpException(401, 'NOT_AUTHORIZED'));
      }

      const token = authHeader.replace('Bearer ', '');
      if (token !== ACCESS_TOKEN) {
        return next(new HttpException(401, 'INVALID_TOKEN'));
      }

      (req as any).user = tokenUser;
      return next();
    }

    // SAML mode: check passport session
    if (req.isAuthenticated()) {
      return next();
    }

    next(new HttpException(401, 'NOT_AUTHORIZED'));
  } catch (error) {
    next(new HttpException(401, 'AUTH_FAILED'));
  }
};

export default authMiddleware;
