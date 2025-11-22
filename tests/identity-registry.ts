import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { IdentityRegistry } from "../target/types/identity_registry";
import { expect } from "chai";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

describe("identity-registry", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.IdentityRegistry as Program<IdentityRegistry>;

  let configPda: PublicKey;
  let configBump: number;
  let admin: Keypair;

  const verificationOracle = Keypair.generate().publicKey;
  const credentialManager = Keypair.generate().publicKey;
  const reputationEngine = Keypair.generate().publicKey;
  const stakingManager = Keypair.generate().publicKey;

  before(async () => {
    admin = Keypair.generate();

    // Airdrop SOL to admin
    const signature = await provider.connection.requestAirdrop(
      admin.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);

    // Derive config PDA
    [configPda, configBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );
  });

  describe("initialize_config", () => {
    it("should initialize the global config", async () => {
      await program.methods
        .initializeConfig(
          verificationOracle,
          credentialManager,
          reputationEngine,
          stakingManager
        )
        .accounts({
          config: configPda,
          admin: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();

      const config = await program.account.globalConfig.fetch(configPda);
      expect(config.admin.toString()).to.equal(admin.publicKey.toString());
      expect(config.verificationOracle.toString()).to.equal(verificationOracle.toString());
      expect(config.credentialManager.toString()).to.equal(credentialManager.toString());
      expect(config.reputationEngine.toString()).to.equal(reputationEngine.toString());
      expect(config.stakingManager.toString()).to.equal(stakingManager.toString());
      expect(config.minStakeAmount.toNumber()).to.equal(1_000_000_000);
      expect(config.verificationFee.toNumber()).to.equal(10_000_000);
    });
  });

  describe("create_identity", () => {
    let user: Keypair;
    let identityPda: PublicKey;

    beforeEach(async () => {
      user = Keypair.generate();

      // Airdrop SOL to user
      const signature = await provider.connection.requestAirdrop(
        user.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(signature);

      [identityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("identity"), user.publicKey.toBuffer()],
        program.programId
      );
    });

    it("should create a new identity", async () => {
      const did = `did:aadhaar:${user.publicKey.toString().slice(0, 20)}`;
      const metadataUri = "https://example.com/metadata.json";
      const recoveryKeys = [Keypair.generate().publicKey];

      await program.methods
        .createIdentity(did, metadataUri, recoveryKeys)
        .accounts({
          identityAccount: identityPda,
          authority: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      const identity = await program.account.identityAccount.fetch(identityPda);
      expect(identity.authority.toString()).to.equal(user.publicKey.toString());
      expect(identity.did).to.equal(did);
      expect(identity.verificationBitmap.toNumber()).to.equal(0);
      expect(identity.reputationScore.toNumber()).to.equal(500);
      expect(identity.stakedAmount.toNumber()).to.equal(0);
      expect(identity.recoveryKeys.length).to.equal(1);
    });

    it("should reject DID that is too long", async () => {
      const longDid = "d".repeat(200);

      try {
        await program.methods
          .createIdentity(longDid, "https://example.com", [])
          .accounts({
            identityAccount: identityPda,
            authority: user.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("DIDTooLong");
      }
    });

    it("should reject too many recovery keys", async () => {
      const tooManyKeys = Array(6).fill(null).map(() => Keypair.generate().publicKey);

      try {
        await program.methods
          .createIdentity("did:test", "https://example.com", tooManyKeys)
          .accounts({
            identityAccount: identityPda,
            authority: user.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("TooManyRecoveryKeys");
      }
    });
  });

  describe("add_recovery_key", () => {
    let user: Keypair;
    let identityPda: PublicKey;

    before(async () => {
      user = Keypair.generate();

      const signature = await provider.connection.requestAirdrop(
        user.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(signature);

      [identityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("identity"), user.publicKey.toBuffer()],
        program.programId
      );

      // Create identity first
      await program.methods
        .createIdentity("did:test:recovery", "https://example.com", [])
        .accounts({
          identityAccount: identityPda,
          authority: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
    });

    it("should add a recovery key", async () => {
      const newRecoveryKey = Keypair.generate().publicKey;

      await program.methods
        .addRecoveryKey(newRecoveryKey)
        .accounts({
          identityAccount: identityPda,
          authority: user.publicKey,
        })
        .signers([user])
        .rpc();

      const identity = await program.account.identityAccount.fetch(identityPda);
      expect(identity.recoveryKeys.length).to.equal(1);
      expect(identity.recoveryKeys[0].toString()).to.equal(newRecoveryKey.toString());
    });
  });

  describe("recover_identity", () => {
    let user: Keypair;
    let recoveryKey: Keypair;
    let identityPda: PublicKey;

    before(async () => {
      user = Keypair.generate();
      recoveryKey = Keypair.generate();

      const signature = await provider.connection.requestAirdrop(
        user.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(signature);

      const signature2 = await provider.connection.requestAirdrop(
        recoveryKey.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(signature2);

      [identityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("identity"), user.publicKey.toBuffer()],
        program.programId
      );

      // Create identity with recovery key
      await program.methods
        .createIdentity("did:test:recovery2", "https://example.com", [recoveryKey.publicKey])
        .accounts({
          identityAccount: identityPda,
          authority: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
    });

    it("should recover identity to new authority", async () => {
      const newAuthority = Keypair.generate().publicKey;

      await program.methods
        .recoverIdentity(newAuthority)
        .accounts({
          identityAccount: identityPda,
          recoverySigner: recoveryKey.publicKey,
        })
        .signers([recoveryKey])
        .rpc();

      const identity = await program.account.identityAccount.fetch(identityPda);
      expect(identity.authority.toString()).to.equal(newAuthority.toString());
    });

    it("should reject unauthorized recovery attempt", async () => {
      const unauthorizedKey = Keypair.generate();

      const signature = await provider.connection.requestAirdrop(
        unauthorizedKey.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(signature);

      try {
        await program.methods
          .recoverIdentity(Keypair.generate().publicKey)
          .accounts({
            identityAccount: identityPda,
            recoverySigner: unauthorizedKey.publicKey,
          })
          .signers([unauthorizedKey])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("UnauthorizedRecovery");
      }
    });
  });
});
