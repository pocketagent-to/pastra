'use client';

import { useRouter } from 'next/navigation';
import { getAccessToken, useLogin } from '@privy-io/react-auth';
import { PrimaryButton } from '@/components/ui/Button';

/** The Privy sign-in button. On success it exchanges the Privy token for a Hextra session. */
export function PrivyLogin() {
  const router = useRouter();
  const { login } = useLogin({
    onComplete: async () => {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch('/api/auth/privy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as { redirect?: string };
      router.push(data.redirect ?? '/pass');
    },
  });

  return <PrimaryButton onClick={() => login()}>Continue</PrimaryButton>;
}
