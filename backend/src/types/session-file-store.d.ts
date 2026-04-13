declare module 'session-file-store' {
  import type session from 'express-session';
  function createFileStore(
    session: typeof import('express-session')
  ): new (options?: Record<string, unknown>) => session.Store;
  export = createFileStore;
}
