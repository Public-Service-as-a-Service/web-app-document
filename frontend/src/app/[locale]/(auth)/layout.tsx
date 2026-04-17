import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-12">
      {children}
    </div>
  );
};

export default AuthLayout;
