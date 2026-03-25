'use client';

import { useTranslation } from 'react-i18next';

const HomePage = () => {
  const { t } = useTranslation();

  return (
    <main className="main-container min-h-screen bg-vattjom-background-100">
      <div className="mx-auto max-w-screen-lg px-6 py-12">
        <h1 className="text-h1-sm md:text-h1-md xl:text-h1-lg mb-4">{t('common:title')}</h1>
        <p className="text-large">{t('common:description')}</p>
      </div>
    </main>
  );
};

export default HomePage;
