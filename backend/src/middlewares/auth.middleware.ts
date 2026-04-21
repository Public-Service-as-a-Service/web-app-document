import { NextFunction, Request, Response } from 'express';
import { HttpException } from '@exceptions/http.exception';
import { AUTH_TYPE, ACCESS_TOKEN } from '@config';
import { mockUsers, getMockUser } from '../mocks/mock-users';

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

      const mockUserCookie = req.cookies?.mock_user;
      const user = (mockUserCookie && getMockUser(mockUserCookie)) || mockUsers[0];

      if (!user) {
        return next(new HttpException(401, 'NO_USER'));
      }

      (req as any).user = user;
      return next();
    }

    // SAML mode: check passport session
    if (req.isAuthenticated()) {
      return next();
    }

    next(new HttpException(401, 'NOT_AUTHORIZED'));
  } catch (_error) {
    next(new HttpException(401, 'AUTH_FAILED'));
  }
};

export default authMiddleware;
