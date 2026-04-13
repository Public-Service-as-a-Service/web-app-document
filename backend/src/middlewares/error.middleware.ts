import { NextFunction, Request, Response } from 'express';
import { HttpException } from '@exceptions/http.exception';
import { logger } from '@utils/logger';

function sanitizeLogInput(input: string): string {
  return input.replace(/[\r\n]/g, '');
}

const mapKnownError = (error: unknown): HttpException => {
  if (error instanceof HttpException) {
    return error;
  }

  // Handle HttpError from routing-controllers (has httpCode property)
  if (error && typeof error === 'object' && 'httpCode' in error) {
    const httpError = error as { httpCode: number; message?: string };
    return new HttpException(httpError.httpCode, httpError.message || 'Error');
  }

  // Handle errors with status property (e.g., from middleware next(new HttpException(...)))
  if (error && typeof error === 'object' && 'status' in error) {
    const statusError = error as { status: number; message?: string };
    return new HttpException(statusError.status, statusError.message || 'Error');
  }

  logger.error(
    `Unhandled error type: ${error?.constructor?.name}, details: ${JSON.stringify(error, Object.getOwnPropertyNames(error as object)).slice(0, 500)}`
  );
  return new HttpException(500, 'Something went wrong');
};

const errorMiddleware = (error: unknown, req: Request, res: Response, next: NextFunction) => {
  try {
    const mappedError = mapKnownError(error);
    const status: number = mappedError.status;
    const message: string = mappedError.message;

    const safeMethod = sanitizeLogInput(String(req.method));
    const safePath = sanitizeLogInput(String(req.path));
    const safeMessage = sanitizeLogInput(String(message));

    logger.error(`[${safeMethod}] ${safePath} >> StatusCode:: ${status}, Message:: ${safeMessage}`);
    res.status(status).json({ message });
  } catch (error) {
    next(error);
  }
};

export default errorMiddleware;
