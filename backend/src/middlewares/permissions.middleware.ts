import { NextFunction, Request, Response } from 'express';
import { HttpException } from '@exceptions/http.exception';
import { Permissions } from '../interfaces/user.interface';

export const hasPermissions =
  (requiredPermissions: Array<keyof Permissions>) => async (req: Request, res: Response, next: NextFunction) => {
    const userPermissions = (req as any).user?.permissions as Permissions | undefined;

    if (!userPermissions) {
      return next(new HttpException(403, 'FORBIDDEN'));
    }

    const hasAll = requiredPermissions.every((p) => userPermissions[p]);
    if (hasAll) {
      return next();
    }

    next(new HttpException(403, 'FORBIDDEN'));
  };
