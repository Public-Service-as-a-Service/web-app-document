export interface AuthStrategy {
  getHeaders(): Promise<Record<string, string>>;
  /**
   * Drop any cached credentials so the next `getHeaders()` call fetches fresh
   * ones. Used to recover from upstream 401 responses when a cached token has
   * been revoked before its advertised expiry.
   */
  invalidate(): void;
}
