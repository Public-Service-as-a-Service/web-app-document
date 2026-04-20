'use client';

import { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useTenant } from '@components/tenant-provider/tenant-provider';
import { apiURL } from '@utils/api-url';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Avatar, AvatarFallback } from '@components/ui/avatar';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import type { UserDto } from '@data-contracts/backend/data-contracts';

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
  const [mockUsers, setMockUsers] = useState<UserDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

  const appURL = (path = '') => {
    return `${window.location.origin}${basePath}/${locale}${path}`;
  };

  const onSamlLogin = () => {
    setIsLoading(true);
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

    setIsLoading(true);
    try {
      const response = await fetch(apiURL('me'), {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        localStorage.setItem('access_token', token);
        setCookie('access_token', token);

        const usersResponse = await fetch(apiURL('mock-users'), {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setMockUsers(usersData.data);
          setStep('user');
          setIsLoading(false);
        } else {
          const redirectPath = searchParams.get('path') || `/${locale}`;
          router.push(redirectPath);
        }
      } else {
        setError(t('common:login_invalid_token'));
        setIsLoading(false);
      }
    } catch {
      setError(t('common:login_error'));
      setIsLoading(false);
    }
  };

  const onSelectUser = (username: string) => {
    setIsLoading(true);
    setCookie('mock_user', username);
    const redirectPath = searchParams.get('path') || `/${locale}`;
    router.push(redirectPath);
  };

  const onBackToToken = () => {
    setStep('token');
    setMockUsers([]);
    setError('');
    setIsLoading(false);
  };

  const isAdmin = (user: UserDto) => user.permissions.canManageDocumentTypes;

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

  const cardDescription =
    isTokenMode && step === 'user'
      ? t('common:login_select_user_description')
      : isTokenMode
        ? t('common:login_token_description')
        : t('common:login_sso_description');

  return (
    <div className="flex w-full max-w-sm flex-col gap-8">
      <header className="flex flex-col items-center gap-4 text-center">
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
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {tenant.appName}
          </h1>
          <p className="font-serif text-base italic leading-relaxed text-muted-foreground">
            {t('common:login_tagline')}
          </p>
        </div>
      </header>

      {loggedOut && (
        <Alert>
          <AlertDescription>{t('common:login_logged_out')}</AlertDescription>
        </Alert>
      )}

      {displayError && (
        <Alert variant="destructive" id="login-error" aria-live="assertive">
          <AlertDescription>{displayError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          {isTokenMode && (
            <Badge variant="secondary" className="w-fit">
              {t('common:login_dev_mode_badge')}
            </Badge>
          )}
          <CardTitle className="text-xl">{t('common:login_title')}</CardTitle>
          <CardDescription>{cardDescription}</CardDescription>
        </CardHeader>

        <CardContent>
          {isTokenMode && step === 'user' ? (
            <div className="space-y-2">
              {mockUsers.map((user) => (
                <Button
                  key={user.username}
                  variant="outline"
                  onClick={() => onSelectUser(user.username)}
                  disabled={isLoading}
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
                    <div className="text-xs font-normal text-muted-foreground">
                      {user.username}
                    </div>
                  </div>
                  <Badge variant={isAdmin(user) ? 'default' : 'secondary'}>
                    {isAdmin(user) ? t('common:login_role_admin') : t('common:login_role_user')}
                  </Badge>
                </Button>
              ))}
            </div>
          ) : isTokenMode ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="token">{t('common:login_token_label')}</Label>
                <Input
                  id="token"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  autoCapitalize="off"
                  aria-describedby={displayError ? 'login-error' : undefined}
                  aria-invalid={displayError ? true : undefined}
                  value={token}
                  disabled={isLoading}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading) onTokenLogin();
                  }}
                  placeholder={t('common:login_token_placeholder')}
                  autoFocus
                />
              </div>
              <Button
                onClick={onTokenLogin}
                disabled={isLoading || !token.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    {t('common:login_loading')}
                  </>
                ) : (
                  t('common:login_button')
                )}
              </Button>
            </div>
          ) : (
            <Button onClick={onSamlLogin} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  {t('common:login_redirecting')}
                </>
              ) : (
                t('common:login_button')
              )}
            </Button>
          )}
        </CardContent>

        {isTokenMode && step === 'user' && (
          <CardFooter>
            <Button variant="ghost" onClick={onBackToToken} className="w-full">
              {t('common:login_back_to_token')}
            </Button>
          </CardFooter>
        )}
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        {t('common:login_footer_service')}
      </p>
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
