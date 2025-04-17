'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';

import { ModelSelector } from '@/components/model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { memo } from 'react';
import { PlusIcon } from './icons';
import { SolanaWalletSelector } from './solana-wallet-selector';
import { useSidebar } from './ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { type VisibilityType, VisibilitySelector } from './visibility-selector';

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  selectedSolanaWallet,
  setSelectedSolanaWallet,
  isReadonly,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  selectedSolanaWallet: string | undefined;
  setSelectedSolanaWallet: (wallet: string) => void;
  isReadonly: boolean;
}) {
  const router = useRouter();
  const { open } = useSidebar();
  const { ready, authenticated, login, logout, user } = usePrivy();

  const { width: windowWidth } = useWindowSize();

  return (
    <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
      <SidebarToggle />

      {(!open || windowWidth < 768) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="order-2 md:px-2 px-2 md:h-fit md:ml-0"
              onClick={() => {
                router.push('/');
                router.refresh();
              }}
            >
              <PlusIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>
      )}

      {!isReadonly && (
        <ModelSelector selectedModelId={selectedModelId} className="order-2" />
      )}

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
          className="order-1 md:order-3"
        />
      )}

      <div className="ml-auto flex flex-row gap-2 order-4">
        {!isReadonly && (
          <SolanaWalletSelector
            selectedSolanaWallet={selectedSolanaWallet}
            setSelectedSolanaWallet={setSelectedSolanaWallet}
          />
        )}

        <Button
          className="bg-primary dark:bg-primary hover:bg-primary/90 dark:hover:bg-primary/90 text-primary-foreground dark:text-primary-foreground md:flex py-1.5 px-2 h-fit md:h-fit"
          disabled={!ready}
          onClick={authenticated ? logout : login}
        >
          {authenticated ? (
            <>
              {user?.email?.address
                ? user.email.address
                : user?.twitter?.username
                  ? user.twitter.username
                  : 'Logout'}
            </>
          ) : (
            'Login'
          )}
        </Button>
      </div>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});
