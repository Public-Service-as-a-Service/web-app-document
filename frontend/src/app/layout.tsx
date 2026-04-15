import '@styles/globals.css';
import { ReactNode } from 'react';
import AppProvider from '@components/app-provider/app-provider';
import type { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

interface RootLayoutProps {
  children: ReactNode;
}

// The `<html>` tag is intentionally rendered without a `lang` attribute here;
// `[locale]/layout.tsx` assigns it at runtime so screen readers announce content
// in the correct language when switching between /sv and /en.
const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html suppressHydrationWarning>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
};

export default RootLayout;
