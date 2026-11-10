'use client';

import { PrivyProvider } from '@privy-io/react-auth';

/**
 * Wrap the app in Privy only when an app id is configured; otherwise render children directly so the
 * app works without Privy keys (dev login). Privy provides email + Google sign-in and the embedded
 * wallet used for the card (docs/architecture.md section 11.1).
 */
export function Providers({ children, appId }: { children: React.ReactNode; appId?: string }) {
  if (!appId) return <>{children}</>;
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email', 'google'],
        appearance: { theme: 'dark', accentColor: '#1F4BFF' },
        embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' } },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
