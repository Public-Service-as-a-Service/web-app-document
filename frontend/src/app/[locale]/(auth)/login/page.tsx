'use client';

import { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useTenant } from '@components/tenant-provider/tenant-provider';
import { apiURL } from '@utils/api-url';
import { Avatar, AvatarFallback } from '@components/ui/avatar';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import type { User } from '@interfaces/user.interface';

const isTokenMode = process.env.NEXT_PUBLIC_AUTH_TYPE === 'token';

function setCookie(name: string, value: string) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax${secure}`;
}

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
  const [step, setStep] = useState<'token' | 'user'>('token');
  const [mockUsers, setMockUsers] = useState<User[]>([]);

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
        setCookie('access_token', token);

        // Fetch mock users and move to user selection step
        const usersResponse = await fetch(apiURL('mock-users'), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setMockUsers(usersData.data);
          setStep('user');
        } else {
          // Fallback: proceed without user selection
          const redirectPath = searchParams.get('path') || `/${locale}`;
          router.push(redirectPath);
        }
      } else {
        setError(t('common:login_invalid_token'));
      }
    } catch {
      setError(t('common:login_error'));
    }
  };

  const onSelectUser = (username: string) => {
    setCookie('mock_user', username);
    const redirectPath = searchParams.get('path') || `/${locale}`;
    router.push(redirectPath);
  };

  const isAdmin = (user: User) => user.permissions.canManageDocumentTypes;

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
        <div
          role="alert"
          aria-live="assertive"
          id="login-error"
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-center text-sm text-destructive"
        >
          {displayError}
        </div>
      )}

      {isTokenMode && step === 'user' ? (
        <div className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            {t('common:login_select_user')}
          </p>
          <div className="space-y-2">
            {mockUsers.map((user) => (
              <Button
                key={user.username}
                variant="outline"
                onClick={() => onSelectUser(user.username)}
                className="h-auto w-full justify-start gap-3 px-4 py-3"
              >
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground font-normal">{user.username}</div>
                </div>
                <Badge variant={isAdmin(user) ? 'default' : 'secondary'}>
                  {isAdmin(user) ? t('common:login_role_admin') : t('common:login_role_user')}
                </Badge>
              </Button>
            ))}
          </div>
        </div>
      ) : isTokenMode ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="token">Access Token</Label>
            <Input
              id="token"
              type="password"
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="off"
              aria-describedby={displayError ? 'login-error' : undefined}
              aria-invalid={displayError ? true : undefined}
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && onTokenLogin()}
              placeholder={t('common:login_token_placeholder')}
              autoFocus
            />
          </div>
          <Button onClick={onTokenLogin} className="w-full">
            {t('common:login_button')}
          </Button>
        </div>
      ) : (
        <Button onClick={onSamlLogin} className="w-full">
          {t('common:login_button')}
        </Button>
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
