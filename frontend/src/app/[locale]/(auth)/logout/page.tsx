'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiURL } from '@utils/api-url';

const isTokenMode = process.env.NEXT_PUBLIC_AUTH_TYPE === 'token';

const LogoutPage = () => {
  const params = useParams();
  const locale = (params?.locale as string) || 'sv';

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

  useEffect(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'mock_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

    if (isTokenMode) {
      window.location.href = `${basePath}/${locale}/login?loggedout`;
    } else {
      const query = new URLSearchParams({
        successRedirect: `${window.location.origin}${basePath}/${locale}/login?loggedout`,
      });
      window.location.href = `${apiURL('saml/logout')}?${query.toString()}`;
    }
  }, [locale, basePath]);

  return null;
};

export default LogoutPage;
