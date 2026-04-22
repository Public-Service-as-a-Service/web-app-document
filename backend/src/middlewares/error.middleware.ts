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

// Safe-to-forward fields from upstream problem+json. Restricted to a known
// shape so we never leak stack traces or internal diagnostics. `status` is
// intentionally dropped — it's already set on the HTTP response.
const extractUpstreamProblem = (
  detail: unknown
): { title?: string; detail?: string } | undefined => {
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return undefined;
  const source = detail as Record<string, unknown>;
  const out: { title?: string; detail?: string } = {};
  if (typeof source.title === 'string') out.title = source.title;
  if (typeof source.detail === 'string') out.detail = source.detail;
  return Object.keys(out).length > 0 ? out : undefined;
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

    // Only forward upstream problem+json on client errors — 5xx stays opaque
    // to avoid leaking internals, and 401 omits details by convention.
    const body: Record<string, unknown> = { message };
    if (status >= 400 && status < 500 && status !== 401) {
      const problem = extractUpstreamProblem(mappedError.upstreamDetail);
      if (problem) Object.assign(body, problem);
    }

    res.status(status).json(body);
  } catch (error) {
    next(error);
  }
};

export default errorMiddleware;
