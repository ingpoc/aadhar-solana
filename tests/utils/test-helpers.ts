import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey, Connection } from "@solana/web3.js";
import * as crypto from "crypto";

/**
 * Shared test utilities for AadhaarChain Solana program tests
 */

// ============== Airdrop Helpers ==============

/**
 * Airdrop SOL to an account with confirmation
 */
export async function airdrop(
  connection: Connection,
  publicKey: PublicKey,
  amount: number = 10
): Promise<void> {
  const signature = await connection.requestAirdrop(
    publicKey,
    amount * anchor.web3.LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(signature);
}

/**
 * Airdrop SOL to multiple accounts in parallel
 */
export async function airdropMultiple(
  connection: Connection,
  accounts: PublicKey[],
  amount: number = 10
): Promise<void> {
  await Promise.all(
    accounts.map((publicKey) => airdrop(connection, publicKey, amount))
  );
}

// ============== ID Generation ==============

/**
 * Generate a random 32-byte ID for credentials, schemas, etc.
 */
export function generateId(): Uint8Array {
  return crypto.randomBytes(32);
}

/**
 * Generate a random hash (32 bytes)
 */
export function generateHash(): Uint8Array {
  return crypto.randomBytes(32);
}

/**
 * Generate a DID string
 */
export function generateDID(publicKey: PublicKey): string {
  return `did:aadhaar:${publicKey.toString().slice(0, 20)}`;
}

// ============== PDA Helpers ==============

/**
 * Find PDA for identity registry config
 */
export function findIdentityConfigPDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  );
}

/**
 * Find PDA for identity account
 */
export function findIdentityPDA(
  authority: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("identity"), authority.toBuffer()],
    programId
  );
}

/**
 * Find PDA for credential manager config
 */
export function findCredentialConfigPDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  );
}

/**
 * Find PDA for credential schema
 */
export function findSchemaPDA(
  schemaId: Uint8Array,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("schema"), schemaId],
    programId
  );
}

/**
 * Find PDA for credential issuer
 */
export function findIssuerPDA(
  authority: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("issuer"), authority.toBuffer()],
    programId
  );
}

/**
 * Find PDA for credential
 */
export function findCredentialPDA(
  credentialId: Uint8Array,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("credential"), credentialId],
    programId
  );
}

/**
 * Find PDA for reputation config
 */
export function findReputationConfigPDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  );
}

/**
 * Find PDA for reputation score
 */
export function findReputationScorePDA(
  identity: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("score"), identity.toBuffer()],
    programId
  );
}

/**
 * Find PDA for staking pool
 */
export function findStakingPoolPDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pool")],
    programId
  );
}

/**
 * Find PDA for stake account
 */
export function findStakeAccountPDA(
  identity: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("stake"), identity.toBuffer()],
    programId
  );
}

// ============== Test Account Factories ==============

/**
 * Create a test keypair with funded account
 */
export async function createFundedKeypair(
  connection: Connection,
  amount: number = 10
): Promise<Keypair> {
  const keypair = Keypair.generate();
  await airdrop(connection, keypair.publicKey, amount);
  return keypair;
}

/**
 * Create multiple funded keypairs
 */
export async function createMultipleFundedKeypairs(
  connection: Connection,
  count: number,
  amount: number = 5
): Promise<Keypair[]> {
  const keypairs = Array(count).fill(null).map(() => Keypair.generate());
  await airdropMultiple(connection, keypairs.map(k => k.publicKey), amount);
  return keypairs;
}

// ============== Assertion Helpers ==============

/**
 * Assert that a transaction fails with a specific error code
 */
export async function expectError(
  promise: Promise<any>,
  errorCode: string
): Promise<void> {
  try {
    await promise;
    throw new Error(`Expected error ${errorCode} but transaction succeeded`);
  } catch (error: any) {
    if (error.error?.errorCode?.code) {
      if (error.error.errorCode.code !== errorCode) {
        throw new Error(
          `Expected error code ${errorCode} but got ${error.error.errorCode.code}`
        );
      }
    } else if (error.message && error.message.includes(errorCode)) {
      // Error code in message
    } else {
      throw error;
    }
  }
}

/**
 * Assert that a transaction fails with any error
 */
export async function expectAnyError(promise: Promise<any>): Promise<void> {
  try {
    await promise;
    throw new Error("Expected error but transaction succeeded");
  } catch (error: any) {
    // Any error is acceptable
    if (error.message === "Expected error but transaction succeeded") {
      throw error;
    }
  }
}

// ============== Time Helpers ==============

/**
 * Get current Unix timestamp
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Get timestamp for N days in the future
 */
export function getFutureTimestamp(days: number): number {
  return getCurrentTimestamp() + days * 86400;
}

/**
 * Get timestamp for N days in the past
 */
export function getPastTimestamp(days: number): number {
  return getCurrentTimestamp() - days * 86400;
}

// ============== Tier Helpers ==============

/**
 * Calculate reputation tier from score
 */
export function getReputationTier(score: number): string {
  if (score <= 300) return "bronze";
  if (score <= 500) return "silver";
  if (score <= 700) return "gold";
  if (score <= 900) return "platinum";
  return "diamond";
}

/**
 * Get default points for reputation event type
 */
export function getEventPoints(eventType: string): number {
  const points: Record<string, number> = {
    verificationCompleted: 50,
    credentialIssued: 30,
    successfulTransaction: 10,
    stakeDeposited: 20,
    consistentActivity: 5,
    verificationFailed: -30,
    credentialRevoked: -50,
    suspiciousActivity: -40,
    stakeSlashed: -60,
    inactivityPenalty: -10,
  };
  return points[eventType] || 0;
}

// ============== Verification Bitmap Helpers ==============

/**
 * Verification type bit positions
 */
export const VERIFICATION_BITS = {
  AADHAAR: 0x01,
  PAN: 0x02,
  VOTER_ID: 0x04,
  EDUCATIONAL: 0x08,
  EMPLOYMENT: 0x10,
  BANK_ACCOUNT: 0x20,
  EMAIL: 0x40,
  PHONE: 0x80,
};

/**
 * Check if verification type is set in bitmap
 */
export function hasVerification(bitmap: number, verificationType: number): boolean {
  return (bitmap & verificationType) !== 0;
}

/**
 * Set verification type in bitmap
 */
export function setVerification(bitmap: number, verificationType: number): number {
  return bitmap | verificationType;
}

/**
 * Count verifications in bitmap
 */
export function countVerifications(bitmap: number): number {
  let count = 0;
  let b = bitmap;
  while (b) {
    count += b & 1;
    b >>= 1;
  }
  return count;
}

// ============== Constants ==============

export const DEFAULT_VALIDITY_PERIOD = 86400 * 365; // 1 year
export const MAX_VALIDITY_PERIOD = 86400 * 365 * 5; // 5 years
export const BASE_REPUTATION_SCORE = 500;
export const MAX_REPUTATION_SCORE = 1000;
export const MIN_REPUTATION_SCORE = 0;
export const DECAY_RATE_BPS = 10; // 0.1% per day
export const MIN_STAKE_AMOUNT = 1_000_000_000; // 1 SOL in lamports
export const VERIFICATION_FEE = 10_000_000; // 0.01 SOL in lamports
