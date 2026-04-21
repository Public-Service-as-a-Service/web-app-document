'use client';

import { ReactNode, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@components/ui/skeleton';
import { useUserStore } from '@stores/user-store';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'sv';
  const user = useUserStore((s) => s.user);

  // personId is the signal that `getMe()` has resolved. Until then the
  // permissions flags live at their defaults (false), so we can't tell a
  // legitimate admin apart from an unauthorized user — hold off on the
  // redirect until we know.
  const loaded = Boolean(user.personId);
  const allowed = user.permissions?.canManageDocumentTypes === true;

  useEffect(() => {
    if (loaded && !allowed) {
      router.replace(`/${locale}`);
    }
  }, [loaded, allowed, router, locale]);

  if (!loaded || !allowed) {
    return (
      <div className="space-y-4 py-6" aria-busy="true">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminLayout;
