'use client';

import { cn } from '@/lib/utils';
import { usePrivy, useSolanaWallets } from '@privy-io/react-auth';
import { useSendTransaction } from '@privy-io/react-auth/solana';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

interface TradeResponse {
  status: string;
  message: string;
  quote: {
    inputMint: string;
    inAmount: string;
    outputMint: string;
    outAmount: string;
    priceImpactPct: string;
    routePlan: Array<{
      swapInfo: {
        label: string;
      };
      percent: number;
    }>;
  };
  swap: {
    swapTransaction: string;
    lastValidBlockHeight: number;
    prioritizationFeeLamports: number;
    computeUnitLimit: number;
  };
}

// Format address to show only first 4 and last 4 characters
function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
}

// Format number with commas and decimal places
function formatNumber(num: string | number, decimals = 6): string {
  const parsedNum = typeof num === 'string' ? Number.parseFloat(num) : num;
  return parsedNum.toLocaleString('en-US', {
    minimumSignificantDigits: 2,
    maximumSignificantDigits: 6,
  });
}

export function TradeResult({ result }: { result: any }) {
  const [rateFlipped, setRateFlipped] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useSolanaWallets();
  const solanaWallet = wallets.at(0);
  const { sendTransaction } = useSendTransaction();

  const raw = result?.content.at(0)?.text;
  const parsed = useMemo(() => {
    try {
      return raw ? (JSON.parse(raw) as TradeResponse) : null;
    } catch (e) {
      return null;
    }
  }, [raw]);
  if (!parsed || parsed.status !== 'success') {
    return (
      <div className="p-4 rounded-2xl bg-background border">
        No route could be found
      </div>
    );
  }

  const { quote, swap } = parsed;
  const inputAmount = Number.parseFloat(quote.inAmount) / 1e9; // Assuming SOL with 9 decimals
  const outputAmount = Number.parseFloat(quote.outAmount) / 1e6; // Assuming token with 6 decimals

  const rate = rateFlipped
    ? inputAmount / outputAmount
    : outputAmount / inputAmount;

  const rateDisplay = rateFlipped
    ? `1 ${formatAddress(quote.outputMint)} = ${formatNumber(rate)} ${formatAddress(quote.inputMint)}`
    : `1 ${formatAddress(quote.inputMint)} = ${formatNumber(rate)} ${formatAddress(quote.outputMint)}`;

  const priceImpact = Number.parseFloat(quote.priceImpactPct) * 100;
  const route = quote.routePlan[0]?.swapInfo?.label || 'Unknown';

  const handleSwap = async () => {
    try {
      if (!ready) {
        toast.error('Privy is not ready yet');
        return;
      }

      if (!authenticated) {
        login();
        return;
      }

      if (!solanaWallet) {
        toast.error('No Solana wallet available');
        login();
        return;
      }

      setIsSwapping(true);

      // The swap transaction is already provided in the result
      const { swapTransaction } = swap;
      console.debug('base64 tx', swapTransaction);

      const receipt = await sendTransaction({
        transaction: VersionedTransaction.deserialize(
          Buffer.from(swapTransaction, 'base64'),
        ),
        connection: new Connection(
          process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
            'https://api.mainnet-beta.solana.com',
          'confirmed',
        ),
      });
      const signature = receipt.signature;

      toast.success('Transaction sent successfully', {
        description: `Transaction ID: ${signature.substring(0, 5)}...${signature.substring(signature.length - 5)}`,
        action: {
          label: 'View',
          onClick: () => {
            window.open(
              `https://explorer.solana.com/tx/${signature}`,
              '_blank',
            );
          },
        },
      });
    } catch (error) {
      console.error('Error sending transaction:', error);
      toast.error('Failed to send transaction', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl p-4 bg-background border">
      <div className="flex flex-col gap-3">
        {/* Top section with selling info */}
        <div className="mb-2">
          <div className="text-sm text-muted-foreground mb-1">Selling</div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{formatAddress(quote.inputMint)}</span>
            </div>
            <div className="text-2xl font-medium">
              {formatNumber(inputAmount)}
            </div>
          </div>
        </div>

        {/* Direction indicator */}
        <div className="flex justify-center">
          <div className="size-8 rounded-full flex items-center justify-center bg-muted">
            ↓
          </div>
        </div>

        {/* Bottom section with buying info */}
        <div>
          <div className="text-sm text-muted-foreground mb-1">Buying</div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{formatAddress(quote.outputMint)}</span>
            </div>
            <div className="text-2xl font-medium">
              {formatNumber(outputAmount)}
            </div>
          </div>
        </div>
      </div>

      {/* Rate section */}
      <button
        type="button"
        onClick={() => setRateFlipped(!rateFlipped)}
        className="flex justify-between items-center py-3 px-4 bg-muted rounded-lg text-sm"
      >
        <span>Rate</span>
        <span>{rateDisplay}</span>
      </button>

      {/* Details section */}
      <div className="flex flex-col gap-2 py-3 px-4 bg-muted rounded-lg text-sm">
        <div className="flex justify-between">
          <span>Network Fee</span>
          <span>0.001 SOL</span>
        </div>
        <div className="flex justify-between">
          <span>Price Impact</span>
          <span
            className={cn({
              'text-red-500': priceImpact > 5,
              'text-yellow-500': priceImpact > 1 && priceImpact <= 5,
              'text-green-500': priceImpact <= 1,
            })}
          >
            {priceImpact.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span>Route</span>
          <span>{route}</span>
        </div>
      </div>

      {/* Swap or Login button */}
      {!ready ? (
        <button
          type="button"
          className="w-full py-3 bg-muted text-muted-foreground rounded-lg font-medium"
          disabled
        >
          Loading...
        </button>
      ) : !authenticated ? (
        <button
          type="button"
          className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium"
          onClick={login}
        >
          Login
        </button>
      ) : (
        <button
          type="button"
          className={cn(
            'w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium',
            { 'opacity-70 cursor-not-allowed': isSwapping },
          )}
          disabled={isSwapping}
          onClick={handleSwap}
        >
          {isSwapping ? 'Swapping...' : 'Swap'}
        </button>
      )}
    </div>
  );
}
