import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { RequestHandler } from 'express';
import { HttpException } from '@/exceptions/http.exception';

const getAllNestedErrors = (error: ValidationError): string => {
  if (error.constraints) {
    return Object.values(error.constraints).join(', ');
  }
  if (error.children) {
    return error.children.map(getAllNestedErrors).join(', ');
  }
  return '';
};

export const validationMiddleware = (
  type: any,
  value: string | 'body' | 'query' | 'params' = 'body',
  skipMissingProperties = false,
  whitelist = true,
  forbidNonWhitelisted = true,
): RequestHandler => {
  return (req, _res, next) => {
    const obj = plainToInstance(type, (req as any)[value]);
    validate(obj, { skipMissingProperties, whitelist, forbidNonWhitelisted }).then(
      (errors: ValidationError[]) => {
        if (errors.length > 0) {
          const message = errors.map(getAllNestedErrors).join(', ');
          next(new HttpException(400, message));
        } else {
          next();
        }
      }
    );
  };
};
