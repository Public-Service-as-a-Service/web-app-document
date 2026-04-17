import type { AuthStrategy } from './auth.strategy';

export class NoneStrategy implements AuthStrategy {
  public async getHeaders(): Promise<Record<string, string>> {
    return {};
  }

  public invalidate(): void {
    // No cached state.
  }
}
