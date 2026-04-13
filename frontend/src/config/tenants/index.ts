import { TenantConfig } from '../tenant-types';
import { defaultConfig } from './default';

const tenants: Record<string, TenantConfig> = {
  default: defaultConfig,
};

export function getTenantConfig(): TenantConfig {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'default';
  return tenants[tenantId] || defaultConfig;
}
