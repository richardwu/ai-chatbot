'use client';

import { startTransition, useEffect, useOptimistic, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import { useSolanaWallets } from '@privy-io/react-auth';
import { toast } from 'sonner';
import { CheckCircleFillIcon, ChevronDownIcon } from './icons';

const formatWalletAddress = (address: string) => {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

export function SolanaWalletSelector({
  selectedSolanaWallet,
  setSelectedSolanaWallet,
  className,
}: {
  selectedSolanaWallet: string | undefined;
  setSelectedSolanaWallet: (wallet: string) => void;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const { wallets, ready, createWallet } = useSolanaWallets();
  const [optimisticSolanaWallet, setOptimisticSolanaWallet] =
    useOptimistic(selectedSolanaWallet);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!wallets.some((wallet) => wallet.address === selectedSolanaWallet)) {
      const firstWallet = wallets.at(0);
      if (firstWallet) {
        startTransition(() => {
          setOptimisticSolanaWallet(firstWallet.address);
          setSelectedSolanaWallet(firstWallet.address);
        });
      }
    }
  }, [
    selectedSolanaWallet,
    ready,
    wallets,
    setSelectedSolanaWallet,
    setOptimisticSolanaWallet,
  ]);

  if (!ready) {
    return null;
  }

  if (!selectedSolanaWallet) {
    return (
      <Button
        variant="outline"
        className="md:px-2 md:h-[34px]"
        disabled={isCreatingWallet}
        onClick={async () => {
          setIsCreatingWallet(true);
          await createWallet()
            .catch((error) => {
              console.error(error);
              toast.error('Failed to create wallet');
            })
            .finally(() => {
              setIsCreatingWallet(false);
            });
        }}
      >
        {isCreatingWallet ? 'Creating...' : 'Create Wallet'}
      </Button>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className,
        )}
      >
        <Button
          data-testid="model-selector"
          variant="outline"
          className="md:px-2 md:h-[34px]"
        >
          {formatWalletAddress(selectedSolanaWallet)}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[300px]">
        {wallets.map((wallet) => {
          const { address } = wallet;

          return (
            <DropdownMenuItem
              data-testid={`model-selector-item-${address}`}
              key={address}
              onSelect={() => {
                setOpen(false);

                startTransition(() => {
                  setOptimisticSolanaWallet(address);
                  setSelectedSolanaWallet(address);
                });
              }}
              data-active={address === optimisticSolanaWallet}
              asChild
            >
              <button
                type="button"
                className="gap-4 group/item flex flex-row justify-between items-center w-full"
              >
                <div className="flex flex-col gap-1 items-start">
                  <div>{formatWalletAddress(address)}</div>
                </div>

                <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                  <CheckCircleFillIcon />
                </div>
              </button>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
