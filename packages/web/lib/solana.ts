import { Connection, PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';

const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'http://localhost:8899';

export const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

export const PROGRAM_IDS = {
  identityRegistry: new PublicKey(
    process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ID || '9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n'
  ),
  verificationOracle: new PublicKey(
    process.env.NEXT_PUBLIC_VERIFICATION_ORACLE_ID || '3zNSrpqKKd7Bdsq1JJeVwPyddt9jCcP6Eg9xMgbZtziY'
  ),
  credentialManager: new PublicKey(
    process.env.NEXT_PUBLIC_CREDENTIAL_MANAGER_ID || '7trw2WbG59rrKKwnCfnFw8mTMNvYpCfpURoVgJYAgTSP'
  ),
  reputationEngine: new PublicKey(
    process.env.NEXT_PUBLIC_REPUTATION_ENGINE_ID || '27mcyzQMfRAf1Y2z9T9cf4DaViEa6Kqc4czwJM1PPonH'
  ),
  stakingManager: new PublicKey(
    process.env.NEXT_PUBLIC_STAKING_MANAGER_ID || 'GyDkVUfK3u4JzADv8ADw7MyCvn68guX5K1Eo7HVDyZSh'
  ),
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
