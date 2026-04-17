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
      primary: 'oklch(0.42 0.11 245)',
      primaryForeground: 'oklch(0.985 0.008 85)',
      ring: 'oklch(0.78 0.16 75)',
      chart1: 'oklch(0.42 0.11 245)',
      sidebarRing: 'oklch(0.78 0.16 75)',
    },
    dark: {
      primary: 'oklch(0.68 0.14 245)',
      primaryForeground: 'oklch(0.18 0.012 85)',
      ring: 'oklch(0.78 0.16 75)',
      chart1: 'oklch(0.68 0.14 245)',
      sidebarRing: 'oklch(0.78 0.16 75)',
    },
  },
};
