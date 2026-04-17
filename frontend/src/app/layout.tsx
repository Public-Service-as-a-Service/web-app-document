import '@styles/globals.css';
import { ReactNode } from 'react';
import AppProvider from '@components/app-provider/app-provider';
import type { Viewport } from 'next';
import { Hanken_Grotesk, Source_Serif_4, Geist_Mono } from 'next/font/google';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

const sans = Hanken_Grotesk({
  subsets: ['latin', 'latin-ext'],
  variable: '--app-font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const serif = Source_Serif_4({
  subsets: ['latin', 'latin-ext'],
  variable: '--app-font-serif',
  display: 'swap',
  weight: ['400', '600'],
});

const mono = Geist_Mono({
  subsets: ['latin'],
  variable: '--app-font-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
});

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html suppressHydrationWarning className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
};

export default RootLayout;
