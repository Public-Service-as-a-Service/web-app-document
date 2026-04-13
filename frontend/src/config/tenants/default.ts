import { TenantConfig } from '../tenant-types';

export const defaultConfig: TenantConfig = {
  id: 'default',
  name: 'Dokumenthantering',
  appName: 'Dokumenthantering',
  logo: {
    src: '/tenants/default/logo.svg',
    alt: 'Sundsvalls kommun',
    width: 19,
    height: 32,
  },
  colors: {
    light: {
      primary: '217 91% 40%',
      primaryForeground: '0 0% 98%',
      ring: '217 91% 40%',
      chart1: '217 91% 40%',
      sidebarRing: '217 91% 40%',
    },
    dark: {
      primary: '217 91% 55%',
      primaryForeground: '0 0% 3.9%',
      ring: '217 91% 55%',
      chart1: '217 91% 55%',
      sidebarRing: '217 91% 55%',
    },
  },
};
