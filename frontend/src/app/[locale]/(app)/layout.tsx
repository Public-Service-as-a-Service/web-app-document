'use client';

import { ReactNode, useEffect, useState } from 'react';
import AppLayout from '@components/layout/app-layout';
import { useUserStore } from '@stores/user-store';

interface AppGroupLayoutProps {
  children: ReactNode;
}

const AppGroupLayout: React.FC<AppGroupLayoutProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    useUserStore.getState().getMe();
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Laddar...</div>
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
};

export default AppGroupLayout;
