import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { StakingManager } from "../target/types/staking_manager";
import { expect } from "chai";
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("staking-manager", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.StakingManager as Program<StakingManager>;

  let poolPda: PublicKey;
  let vaultPda: PublicKey;
  let admin: Keypair;

  const identityRegistry = Keypair.generate().publicKey;
  const verificationOracle = Keypair.generate().publicKey;

  const MIN_STAKE = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL for testing
  const REWARD_RATE = 500; // 5% APY
  const UNSTAKE_COOLDOWN = 60; // 60 seconds for testing

  before(async () => {
    admin = Keypair.generate();

    const signature = await provider.connection.requestAirdrop(
      admin.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);

    [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool")],
      program.programId
    );

    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );
  });

  describe("initialize_pool", () => {
    it("should initialize the staking pool", async () => {
      await program.methods
        .initializePool(
          new anchor.BN(MIN_STAKE),
          REWARD_RATE,
          new anchor.BN(UNSTAKE_COOLDOWN),
          identityRegistry,
          verificationOracle
        )
        .accounts({
          pool: poolPda,
          poolVault: vaultPda,
          admin: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();

      const pool = await program.account.stakingPool.fetch(poolPda);
      expect(pool.admin.toString()).to.equal(admin.publicKey.toString());
      expect(pool.totalStaked.toNumber()).to.equal(0);
      expect(pool.minStakeAmount.toNumber()).to.equal(MIN_STAKE);
      expect(pool.rewardRateBps).to.equal(REWARD_RATE);
      expect(pool.unstakeCooldown.toNumber()).to.equal(UNSTAKE_COOLDOWN);
      expect(pool.paused).to.be.false;
    });
  });

  describe("stake", () => {
    let staker: Keypair;
    let stakeAccountPda: PublicKey;

    beforeEach(async () => {
      staker = Keypair.generate();

      const signature = await provider.connection.requestAirdrop(
        staker.publicKey,
        5 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(signature);

      [stakeAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("stake"), staker.publicKey.toBuffer()],
        program.programId
      );
    });

    it("should stake SOL", async () => {
      const stakeAmount = 1 * LAMPORTS_PER_SOL;
      const balanceBefore = await provider.connection.getBalance(staker.publicKey);

      await program.methods
        .stake(new anchor.BN(stakeAmount))
        .accounts({
          pool: poolPda,
          stakeAccount: stakeAccountPda,
          poolVault: vaultPda,
          owner: staker.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([staker])
        .rpc();

      const stakeAccount = await program.account.stakeAccount.fetch(stakeAccountPda);
      expect(stakeAccount.owner.toString()).to.equal(staker.publicKey.toString());
      expect(stakeAccount.stakedAmount.toNumber()).to.equal(stakeAmount);
      expect(stakeAccount.slashCount).to.equal(0);

      const balanceAfter = await provider.connection.getBalance(staker.publicKey);
      // Balance should be reduced by stake amount + rent
      expect(balanceBefore - balanceAfter).to.be.greaterThan(stakeAmount);

      const pool = await program.account.stakingPool.fetch(poolPda);
      expect(pool.totalStaked.toNumber()).to.be.greaterThan(0);
    });

    it("should reject stake below minimum", async () => {
      const tooSmall = MIN_STAKE - 1000;

      try {
        await program.methods
          .stake(new anchor.BN(tooSmall))
          .accounts({
            pool: poolPda,
            stakeAccount: stakeAccountPda,
            poolVault: vaultPda,
            owner: staker.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([staker])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("InsufficientStakeAmount");
      }
    });
  });

  describe("request_unstake", () => {
    let staker: Keypair;
    let stakeAccountPda: PublicKey;

    before(async () => {
      staker = Keypair.generate();

      const signature = await provider.connection.requestAirdrop(
        staker.publicKey,
        5 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(signature);

      [stakeAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("stake"), staker.publicKey.toBuffer()],
        program.programId
      );

      // Stake first
      await program.methods
        .stake(new anchor.BN(1 * LAMPORTS_PER_SOL))
        .accounts({
          pool: poolPda,
          stakeAccount: stakeAccountPda,
          poolVault: vaultPda,
          owner: staker.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([staker])
        .rpc();
    });

    it("should request unstake", async () => {
      const unstakeAmount = 0.5 * LAMPORTS_PER_SOL;

      await program.methods
        .requestUnstake(new anchor.BN(unstakeAmount))
        .accounts({
          pool: poolPda,
          stakeAccount: stakeAccountPda,
          owner: staker.publicKey,
        })
        .signers([staker])
        .rpc();

      const stakeAccount = await program.account.stakeAccount.fetch(stakeAccountPda);
      expect(stakeAccount.unstakeRequestedAt.toNumber()).to.be.greaterThan(0);
      expect(stakeAccount.unstakeAmount.toNumber()).to.equal(unstakeAmount);
    });

    it("should reject second unstake request", async () => {
      try {
        await program.methods
          .requestUnstake(new anchor.BN(0.1 * LAMPORTS_PER_SOL))
          .accounts({
            pool: poolPda,
            stakeAccount: stakeAccountPda,
            owner: staker.publicKey,
          })
          .signers([staker])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("UnstakeAlreadyRequested");
      }
    });
  });

  describe("update_pool_config", () => {
    it("should update pool config as admin", async () => {
      const newMinStake = 0.2 * LAMPORTS_PER_SOL;

      await program.methods
        .updatePoolConfig(
          new anchor.BN(newMinStake),
          null,
          null
        )
        .accounts({
          pool: poolPda,
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc();

      const pool = await program.account.stakingPool.fetch(poolPda);
      expect(pool.minStakeAmount.toNumber()).to.equal(newMinStake);
    });
  });

  describe("set_pool_paused", () => {
    it("should pause and unpause pool", async () => {
      // Pause
      await program.methods
        .setPoolPaused(true)
        .accounts({
          pool: poolPda,
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc();

      let pool = await program.account.stakingPool.fetch(poolPda);
      expect(pool.paused).to.be.true;

      // Unpause
      await program.methods
        .setPoolPaused(false)
        .accounts({
          pool: poolPda,
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc();

      pool = await program.account.stakingPool.fetch(poolPda);
      expect(pool.paused).to.be.false;
    });
  });
});
