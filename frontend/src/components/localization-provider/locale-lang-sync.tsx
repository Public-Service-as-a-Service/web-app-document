'use client';

import { useEffect } from 'react';

interface LocaleLangSyncProps {
  locale: string;
}

const LocaleLangSync: React.FC<LocaleLangSyncProps> = ({ locale }) => {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', locale);
    }
  }, [locale]);

  return null;
};

export default LocaleLangSync;
