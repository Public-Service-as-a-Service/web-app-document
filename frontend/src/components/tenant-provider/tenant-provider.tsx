'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { TenantConfig } from '@config/tenant-types';
import { getTenantConfig } from '@config/tenants';

const tenantConfig = getTenantConfig();

const TenantContext = createContext<TenantConfig>(tenantConfig);

export function useTenant(): TenantConfig {
  return useContext(TenantContext);
}

interface TenantProviderProps {
  children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  useEffect(() => {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    const colors = isDark ? tenantConfig.colors.dark : tenantConfig.colors.light;

    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--primary-foreground', colors.primaryForeground);
    root.style.setProperty('--ring', colors.ring);
    root.style.setProperty('--chart-1', colors.chart1);
    root.style.setProperty('--sidebar-ring', colors.sidebarRing);

    const observer = new MutationObserver(() => {
      const nowDark = root.classList.contains('dark');
      const c = nowDark ? tenantConfig.colors.dark : tenantConfig.colors.light;
      root.style.setProperty('--primary', c.primary);
      root.style.setProperty('--primary-foreground', c.primaryForeground);
      root.style.setProperty('--ring', c.ring);
      root.style.setProperty('--chart-1', c.chart1);
      root.style.setProperty('--sidebar-ring', c.sidebarRing);
    });

    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <TenantContext.Provider value={tenantConfig}>
      {children}
    </TenantContext.Provider>
  );
}
