'use client';

import { useCallback, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, PublicKey } from '@solana/web3.js';
import { getBalance as getBalanceUtil } from '@/lib/solana';

export function useSolana() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [loading, setLoading] = useState(false);

  const getBalance = useCallback(async (): Promise<number> => {
    if (!publicKey) return 0;
    try {
      return await getBalanceUtil(publicKey);
    } catch (error) {
      console.error('Error fetching balance:', error);
      return 0;
    }
  }, [publicKey]);

  const sendAndConfirmTransaction = useCallback(
    async (transaction: Transaction): Promise<string> => {
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);

      try {
        // Get latest blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        // Send transaction
        const signature = await sendTransaction(transaction, connection);

        // Wait for confirmation
        await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight,
        });

        return signature;
      } finally {
        setLoading(false);
      }
    },
    [publicKey, connection, sendTransaction]
  );

  const requestAirdrop = useCallback(
    async (amount: number = 1): Promise<string> => {
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);

      try {
        const signature = await connection.requestAirdrop(
          publicKey,
          amount * 1_000_000_000
        );

        await connection.confirmTransaction(signature);
        return signature;
      } finally {
        setLoading(false);
      }
    },
    [publicKey, connection]
  );

  return {
    connection,
    publicKey,
    loading,
    getBalance,
    sendAndConfirmTransaction,
    requestAirdrop,
  };
}
