import '@styles/tailwind.scss';
import { ReactNode } from 'react';
import AppProvider from '@components/app-provider/app-provider';
import i18nConfig from './i18nConfig';
import type { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang={i18nConfig.defaultLocale}>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
};

export default RootLayout;
