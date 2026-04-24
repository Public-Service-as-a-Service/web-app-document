'use client';

import { ReactNode, useEffect, useState } from 'react';
import AppLayout from '@components/layout/app-layout';
import { useUserStore } from '@stores/user-store';
import { PageTransitionRoot } from '@components/motion/directional-transition';
import { KeyboardShortcutsProvider } from '@components/keyboard-shortcuts/keyboard-shortcuts-provider';
import { ChatWidget } from '@components/chat/chat-widget';

interface AppGroupLayoutProps {
  children: ReactNode;
}

const AppGroupLayout: React.FC<AppGroupLayoutProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    useUserStore.getState().getMe();
    // Hydration guard — intentional synchronous setState
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">...</div>
      </div>
    );
  }

  return (
    <KeyboardShortcutsProvider>
      <AppLayout>
        <PageTransitionRoot>{children}</PageTransitionRoot>
      </AppLayout>
      <ChatWidget />
    </KeyboardShortcutsProvider>
  );
};

export default AppGroupLayout;
