'use client';

import { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useTenant } from '@components/tenant-provider/tenant-provider';
import { apiURL } from '@utils/api-url';

const isTokenMode = process.env.NEXT_PUBLIC_AUTH_TYPE === 'token';

const LoginContent = () => {
  const { t } = useTranslation();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'sv';
  const tenant = useTenant();

  const failMessage = searchParams.get('failMessage');
  const loggedOut = searchParams.has('loggedout');

  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

  const appURL = (path = '') => {
    return `${window.location.origin}${basePath}/${locale}${path}`;
  };

  const onSamlLogin = () => {
    const redirectPath = searchParams.get('path') || '/';
    const url = new URL(apiURL('saml/login'), window.location.origin);
    const queries = new URLSearchParams({
      successRedirect: appURL(redirectPath),
      failureRedirect: appURL('/login'),
    });
    url.search = queries.toString();
    // Full page navigation required — leaving the app for IdP
    window.location.href = url.toString();
  };

  const onTokenLogin = async () => {
    if (!token.trim()) {
      setError(t('common:login_token_required'));
      return;
    }

    try {
      const response = await fetch(apiURL('me'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        localStorage.setItem('access_token', token);
        const redirectPath = searchParams.get('path') || `/${locale}`;
        router.push(redirectPath);
      } else {
        setError(t('common:login_invalid_token'));
      }
    } catch {
      setError(t('common:login_error'));
    }
  };

  const errorMessages: Record<string, string> = {
    NOT_AUTHORIZED: t('common:login_not_authorized'),
    SAML_MISSING_PROFILE: t('common:login_saml_error'),
    SAML_MISSING_ATTRIBUTES: t('common:login_saml_error'),
    SAML_MISSING_GROUP: t('common:login_missing_group'),
    SAML_UNKNOWN_ERROR: t('common:login_saml_error'),
    NO_USER: t('common:login_no_user'),
    INVALID_TOKEN: t('common:login_invalid_token'),
  };

  const displayError = failMessage ? errorMessages[failMessage] || failMessage : error;

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="flex flex-col items-center gap-4">
        <span
          role="img"
          aria-label={tenant.logo.alt}
          className="block bg-foreground"
          style={{
            width: tenant.logo.width,
            height: tenant.logo.height,
            maskImage: `url(${tenant.logo.src})`,
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskImage: `url(${tenant.logo.src})`,
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
          }}
        />
        <h1 className="text-2xl font-bold text-foreground">{tenant.appName}</h1>
      </div>

      {loggedOut && (
        <div className="rounded-lg border border-border bg-card p-3 text-center text-sm text-muted-foreground">
          {t('common:login_logged_out')}
        </div>
      )}

      {displayError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-center text-sm text-destructive">
          {displayError}
        </div>
      )}

      {isTokenMode ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="token" className="mb-1.5 block text-sm font-medium text-foreground">
              Access Token
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && onTokenLogin()}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder={t('common:login_token_placeholder')}
              autoFocus
            />
          </div>
          <button
            onClick={onTokenLogin}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t('common:login_button')}
          </button>
        </div>
      ) : (
        <button
          onClick={onSamlLogin}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t('common:login_button')}
        </button>
      )}
    </div>
  );
};

const LoginPage = () => {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
};

export default LoginPage;
