import { ReactNode } from 'react';
import LocalizationProvider from '@components/localization-provider/localization-provider';
import LocaleLangSync from '@components/localization-provider/locale-lang-sync';
import initLocalization from '../i18n';
import i18nConfig from '../i18nConfig';

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

const namespaces = ['common'];

export const generateStaticParams = () => i18nConfig.locales.map((locale) => ({ locale }));

const LocaleLayout = async ({ children, params }: LocaleLayoutProps) => {
  const { locale } = await params;
  const { resources } = await initLocalization(locale, namespaces);

  return (
    <LocalizationProvider {...{ locale, resources, namespaces }}>
      <LocaleLangSync locale={locale} />
      {children}
    </LocalizationProvider>
  );
};

export const generateMetadata = async () => {
  return {
    title: process.env.NEXT_PUBLIC_APP_NAME || 'Dokument',
    description: 'Dokumenthantering',
  };
};

export default LocaleLayout;
