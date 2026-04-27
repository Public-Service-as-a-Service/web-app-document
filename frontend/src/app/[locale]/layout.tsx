import { ReactNode } from 'react';
import LocalizationProvider from '@components/localization-provider/localization-provider';
import LocaleLangSync from '@components/localization-provider/locale-lang-sync';
import initLocalization from '../i18n';
import i18nConfig from '../i18nConfig';

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

// Translation keys are split into per-domain namespaces so that touching
// document copy doesn't churn the same `common.json` everyone else edits.
// Add new namespaces here as they are introduced (organization, statistics,
// etc.) — i18next will load them in parallel from /locales/<lang>/<ns>.json.
const namespaces = ['common', 'documents'];

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
