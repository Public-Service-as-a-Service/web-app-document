import { HttpError } from 'routing-controllers';

export class HttpException extends HttpError {
  public status: number;
  public message: string;
  public upstreamDetail?: unknown;

  constructor(status: number, message: string, upstreamDetail?: unknown) {
    super(status, message);
    this.status = status;
    this.message = message;
    this.upstreamDetail = upstreamDetail;
  }
}
