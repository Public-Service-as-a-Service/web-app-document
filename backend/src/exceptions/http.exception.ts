import { HttpError } from 'routing-controllers';

export class HttpException extends HttpError {
  public status: number;
  public message: string;
  public upstreamDetail?: unknown;

  constructor(status: number, message: string, upstreamDetail?: unknown) {
    super(status, message);
    // HttpError's constructor pins the prototype to HttpError.prototype, so
    // we must restore it here or `instanceof HttpException` always returns false.
    Object.setPrototypeOf(this, HttpException.prototype);
    this.name = 'HttpException';
    this.status = status;
    this.message = message;
    this.upstreamDetail = upstreamDetail;
  }
}
