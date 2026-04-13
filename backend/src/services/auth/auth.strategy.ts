export interface AuthStrategy {
  getHeaders(): Promise<Record<string, string>>;
}
