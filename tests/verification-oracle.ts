import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VerificationOracle } from "../target/types/verification_oracle";
import { expect } from "chai";
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as crypto from "crypto";

describe("verification-oracle", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.VerificationOracle as Program<VerificationOracle>;

  let configPda: PublicKey;
  let feeVaultPda: PublicKey;
  let admin: Keypair;

  const identityRegistry = Keypair.generate().publicKey;
  const stakingManager = Keypair.generate().publicKey;

  const MIN_ORACLE_STAKE = 10 * LAMPORTS_PER_SOL;
  const VERIFICATION_FEE = 0.01 * LAMPORTS_PER_SOL;
  const REQUIRED_CONFIRMATIONS = 2;
  const VERIFICATION_TIMEOUT = 3600; // 1 hour
  const SLASH_PERCENTAGE = 1000; // 10%

  before(async () => {
    admin = Keypair.generate();

    const signature = await provider.connection.requestAirdrop(
      admin.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);

    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    [feeVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("fee_vault")],
      program.programId
    );
  });

  describe("initialize", () => {
    it("should initialize the oracle config", async () => {
      await program.methods
        .initialize(
          identityRegistry,
          stakingManager,
          new anchor.BN(MIN_ORACLE_STAKE),
          new anchor.BN(VERIFICATION_FEE),
          REQUIRED_CONFIRMATIONS,
          new anchor.BN(VERIFICATION_TIMEOUT),
          SLASH_PERCENTAGE
        )
        .accounts({
          config: configPda,
          admin: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();

      const config = await program.account.oracleConfig.fetch(configPda);
      expect(config.admin.toString()).to.equal(admin.publicKey.toString());
      expect(config.identityRegistry.toString()).to.equal(identityRegistry.toString());
      expect(config.minOracleStake.toNumber()).to.equal(MIN_ORACLE_STAKE);
      expect(config.verificationFee.toNumber()).to.equal(VERIFICATION_FEE);
      expect(config.requiredConfirmations).to.equal(REQUIRED_CONFIRMATIONS);
      expect(config.verificationTimeout.toNumber()).to.equal(VERIFICATION_TIMEOUT);
      expect(config.activeOracleCount).to.equal(0);
      expect(config.totalVerifications.toNumber()).to.equal(0);
    });
  });

  describe("register_oracle", () => {
    let oracleAuthority: Keypair;
    let oraclePda: PublicKey;
    let stakeAccount: Keypair;

    beforeEach(async () => {
      oracleAuthority = Keypair.generate();
      stakeAccount = Keypair.generate();

      const signature = await provider.connection.requestAirdrop(
        oracleAuthority.publicKey,
        5 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(signature);

      [oraclePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("oracle"), oracleAuthority.publicKey.toBuffer()],
        program.programId
      );
    });

    it("should register a new oracle", async () => {
      await program.methods
        .registerOracle()
        .accounts({
          config: configPda,
          oracleNode: oraclePda,
          stakeAccount: stakeAccount.publicKey,
          authority: oracleAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([oracleAuthority])
        .rpc();

      const oracle = await program.account.oracleNode.fetch(oraclePda);
      expect(oracle.authority.toString()).to.equal(oracleAuthority.publicKey.toString());
      expect(oracle.stakeAccount.toString()).to.equal(stakeAccount.publicKey.toString());
      expect(oracle.status).to.deep.equal({ active: {} });
      expect(oracle.verificationsSubmitted.toNumber()).to.equal(0);
      expect(oracle.slashCount).to.equal(0);

      const config = await program.account.oracleConfig.fetch(configPda);
      expect(config.activeOracleCount).to.equal(1);
    });
  });

  describe("deregister_oracle", () => {
    let oracleAuthority: Keypair;
    let oraclePda: PublicKey;

    before(async () => {
      oracleAuthority = Keypair.generate();

      const signature = await provider.connection.requestAirdrop(
        oracleAuthority.publicKey,
        5 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(signature);

      [oraclePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("oracle"), oracleAuthority.publicKey.toBuffer()],
        program.programId
      );

      // Register first
      await program.methods
        .registerOracle()
        .accounts({
          config: configPda,
          oracleNode: oraclePda,
          stakeAccount: Keypair.generate().publicKey,
          authority: oracleAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([oracleAuthority])
        .rpc();
    });

    it("should deregister an oracle", async () => {
      await program.methods
        .deregisterOracle()
        .accounts({
          config: configPda,
          oracleNode: oraclePda,
          authority: oracleAuthority.publicKey,
        })
        .signers([oracleAuthority])
        .rpc();

      const oracle = await program.account.oracleNode.fetch(oraclePda);
      expect(oracle.status).to.deep.equal({ inactive: {} });
    });
  });

  describe("request_verification", () => {
    let requester: Keypair;
    let identityPubkey: Keypair;
    let verificationRequestPda: PublicKey;
    let oracleAuthority: Keypair;
    let oraclePda: PublicKey;

    before(async () => {
      requester = Keypair.generate();
      identityPubkey = Keypair.generate();
      oracleAuthority = Keypair.generate();

      const sig1 = await provider.connection.requestAirdrop(
        requester.publicKey,
        5 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig1);

      const sig2 = await provider.connection.requestAirdrop(
        oracleAuthority.publicKey,
        5 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig2);

      // Register oracle
      [oraclePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("oracle"), oracleAuthority.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .registerOracle()
        .accounts({
          config: configPda,
          oracleNode: oraclePda,
          stakeAccount: Keypair.generate().publicKey,
          authority: oracleAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([oracleAuthority])
        .rpc();
    });

    it("should create a verification request", async () => {
      const verificationType = 0; // Aadhaar
      const verificationHash = crypto.randomBytes(32);

      [verificationRequestPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("request"),
          identityPubkey.publicKey.toBuffer(),
          Buffer.from([verificationType]),
        ],
        program.programId
      );

      await program.methods
        .requestVerification(verificationType, Array.from(verificationHash))
        .accounts({
          config: configPda,
          verificationRequest: verificationRequestPda,
          identity: identityPubkey.publicKey,
          feeVault: feeVaultPda,
          requester: requester.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([requester])
        .rpc();

      const request = await program.account.verificationRequest.fetch(verificationRequestPda);
      expect(request.identity.toString()).to.equal(identityPubkey.publicKey.toString());
      expect(request.verificationType).to.equal(verificationType);
      expect(request.status).to.deep.equal({ pending: {} });
      expect(request.confirmations).to.equal(0);
      expect(request.rejections).to.equal(0);
      expect(request.result).to.be.null;
    });
  });

  describe("update_config", () => {
    it("should update oracle config as admin", async () => {
      const newFee = 0.02 * LAMPORTS_PER_SOL;

      await program.methods
        .updateConfig(
          null, // min_oracle_stake
          new anchor.BN(newFee), // verification_fee
          null, // required_confirmations
          null, // verification_timeout
          null  // slash_percentage_bps
        )
        .accounts({
          config: configPda,
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc();

      const config = await program.account.oracleConfig.fetch(configPda);
      expect(config.verificationFee.toNumber()).to.equal(newFee);
    });
  });
});
