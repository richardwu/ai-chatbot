'use client';

import { PrivyProvider as PrivyProviderBase } from '@privy-io/react-auth';

export function PrivyProvider({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const clientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;
  const solanaRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

  if (!appId || !clientId) {
    console.error(
      'Missing NEXT_PUBLIC_PRIVY_APP_ID or NEXT_PUBLIC_PRIVY_CLIENT_ID environment variable',
    );
    return <>{children}</>;
  }

  return (
    <PrivyProviderBase
      clientId={clientId}
      appId={appId}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        solanaClusters: [
          {
            name: 'mainnet-beta',
            rpcUrl: solanaRpcUrl || 'https://api.mainnet-beta.solana.com',
          },
        ],
      }}
    >
      {children}
    </PrivyProviderBase>
  );
}
