export interface TenantColors {
  primary: string;
  primaryForeground: string;
  ring: string;
  chart1: string;
  sidebarRing: string;
}

export interface TenantLogo {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface TenantConfig {
  id: string;
  name: string;
  appName: string;
  logo: TenantLogo;
  colors: {
    light: TenantColors;
    dark: TenantColors;
  };
}
