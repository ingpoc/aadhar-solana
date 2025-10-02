import { Connection, PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';

const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'http://localhost:8899';

export const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

export const PROGRAM_IDS = {
  identityRegistry: new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS'),
  verificationOracle: new PublicKey('FJzG8XuVKmNdHpHqkdg7tMxUNNHZLLqaWBNgWz6bPsxZ'),
  credentialManager: new PublicKey('FoZKx8qQqKvpwHHzCvuqQtmKLx4zUqNqmJz7uSxYpGhS'),
  reputationEngine: new PublicKey('FpRDg4wqEHkzVMQvYtNzCXvXqNqSxqwKLjPzxYpGhSmQ'),
  stakingManager: new PublicKey('FqSMx8qQqKvpwHHzCvuqQtmKLx4zUqNqmJz7uSxYpGhR'),
};

export const findIdentityPDA = (authority: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('identity'), authority.toBuffer()],
    PROGRAM_IDS.identityRegistry
  );
};

export const findVerificationPDA = (identity: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('verification'), identity.toBuffer()],
    PROGRAM_IDS.verificationOracle
  );
};

export const findCredentialPDA = (identity: PublicKey, credentialId: string): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('credential'), identity.toBuffer(), Buffer.from(credentialId)],
    PROGRAM_IDS.credentialManager
  );
};

export const airdropSOL = async (publicKey: PublicKey, amount: number = 1) => {
  const signature = await connection.requestAirdrop(
    publicKey,
    amount * 1_000_000_000
  );
  await connection.confirmTransaction(signature);
  return signature;
};

export const getBalance = async (publicKey: PublicKey): Promise<number> => {
  const balance = await connection.getBalance(publicKey);
  return balance / 1_000_000_000;
};
