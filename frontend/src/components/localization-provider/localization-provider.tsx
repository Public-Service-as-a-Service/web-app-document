'use client';

import { memo, ReactNode, useMemo } from 'react';
import { createInstance, Resource } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import i18nConfig from '@app/i18nConfig';

interface LocalizationProviderProps {
  children: ReactNode;
  locale: string;
  namespaces: string[];
  resources: Resource;
}

const LocalizationProvider = memo<LocalizationProviderProps>(({ children, locale, namespaces, resources }) => {
  const i18n = useMemo(() => {
    const instance = createInstance();
    instance.use(initReactI18next);
    void instance.init({
      lng: locale,
      resources,
      fallbackLng: i18nConfig.defaultLocale,
      supportedLngs: i18nConfig.locales,
      defaultNS: namespaces[0],
      fallbackNS: namespaces[0],
      ns: namespaces,
      preload: [],
      initImmediate: false,
    });
    return instance;
  }, [locale, namespaces, resources]);

  return <I18nextProvider {...{ i18n }}>{children}</I18nextProvider>;
});

LocalizationProvider.displayName = 'LocalizationProvider';
export default LocalizationProvider;
