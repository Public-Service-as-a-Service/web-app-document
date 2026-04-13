declare module 'session-file-store' {
  import session from 'express-session';
  function createFileStore(session: typeof import('express-session')): any;
  export = createFileStore;
}
