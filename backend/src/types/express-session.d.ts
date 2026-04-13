import { User } from '../interfaces/user.interface';

declare module 'express-session' {
  interface SessionData {
    returnTo?: string;
    user?: User;
    passport?: { user?: User };
    messages: string[];
  }
}
