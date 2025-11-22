import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CredentialManager } from "../target/types/credential_manager";
import { expect } from "chai";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import * as crypto from "crypto";

describe("credential-manager", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.CredentialManager as Program<CredentialManager>;

  // Test accounts
  let admin: Keypair;
  let configPda: PublicKey;
  let configBump: number;

  // Identity registry placeholder
  const identityRegistry = Keypair.generate().publicKey;

  // Constants for testing
  const DEFAULT_VALIDITY_PERIOD = 86400 * 365; // 1 year in seconds
  const MAX_VALIDITY_PERIOD = 86400 * 365 * 5; // 5 years in seconds

  // Helper to generate random bytes
  const generateId = (): Uint8Array => {
    return crypto.randomBytes(32);
  };

  // Helper to airdrop SOL
  const airdrop = async (publicKey: PublicKey, amount: number = 10): Promise<void> => {
    const signature = await provider.connection.requestAirdrop(
      publicKey,
      amount * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);
  };

  before(async () => {
    admin = Keypair.generate();
    await airdrop(admin.publicKey);

    // Derive config PDA
    [configPda, configBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );
  });

  describe("initialize", () => {
    it("should initialize the credential manager config", async () => {
      await program.methods
        .initialize(
          identityRegistry,
          new anchor.BN(DEFAULT_VALIDITY_PERIOD),
          new anchor.BN(MAX_VALIDITY_PERIOD)
        )
        .accounts({
          config: configPda,
          admin: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();

      const config = await program.account.credentialConfig.fetch(configPda);
      expect(config.admin.toString()).to.equal(admin.publicKey.toString());
      expect(config.identityRegistry.toString()).to.equal(identityRegistry.toString());
      expect(config.defaultValidityPeriod.toNumber()).to.equal(DEFAULT_VALIDITY_PERIOD);
      expect(config.maxValidityPeriod.toNumber()).to.equal(MAX_VALIDITY_PERIOD);
      expect(config.totalSchemas.toNumber()).to.equal(0);
      expect(config.totalCredentials.toNumber()).to.equal(0);
    });
  });

  describe("create_schema", () => {
    const schemaId = generateId();
    let schemaPda: PublicKey;
    let schemaCreator: Keypair;

    before(async () => {
      schemaCreator = Keypair.generate();
      await airdrop(schemaCreator.publicKey, 5);

      [schemaPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("schema"), schemaId],
        program.programId
      );
    });

    it("should create a new credential schema", async () => {
      const schemaName = "AadhaarVerification";
      const version = 1;
      const requiredIssuerVerification = 3;
      const transferable = false;
      const revocable = true;

      await program.methods
        .createSchema(
          Array.from(schemaId),
          schemaName,
          version,
          requiredIssuerVerification,
          transferable,
          revocable
        )
        .accounts({
          config: configPda,
          schema: schemaPda,
          creator: schemaCreator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([schemaCreator])
        .rpc();

      const schema = await program.account.credentialSchema.fetch(schemaPda);
      expect(schema.name).to.equal(schemaName);
      expect(schema.version).to.equal(version);
      expect(schema.creator.toString()).to.equal(schemaCreator.publicKey.toString());
      expect(schema.requiredIssuerVerification).to.equal(requiredIssuerVerification);
      expect(schema.transferable).to.equal(transferable);
      expect(schema.revocable).to.equal(revocable);
      expect(schema.active).to.equal(true);

      // Verify config updated
      const config = await program.account.credentialConfig.fetch(configPda);
      expect(config.totalSchemas.toNumber()).to.equal(1);
    });

    it("should reject schema with name too long", async () => {
      const longSchemaId = generateId();
      const [longSchemaPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("schema"), longSchemaId],
        program.programId
      );

      const longName = "x".repeat(100); // Exceeds MAX_NAME_LEN of 64

      try {
        await program.methods
          .createSchema(
            Array.from(longSchemaId),
            longName,
            1,
            1,
            false,
            true
          )
          .accounts({
            config: configPda,
            schema: longSchemaPda,
            creator: schemaCreator.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([schemaCreator])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("SchemaNameTooLong");
      }
    });
  });

  describe("register_issuer", () => {
    let issuerAuthority: Keypair;
    let issuerIdentity: Keypair;
    let issuerPda: PublicKey;

    before(async () => {
      issuerAuthority = Keypair.generate();
      issuerIdentity = Keypair.generate();
      await airdrop(issuerAuthority.publicKey, 5);

      [issuerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("issuer"), issuerAuthority.publicKey.toBuffer()],
        program.programId
      );
    });

    it("should register a credential issuer", async () => {
      const issuerName = "Government of India";
      const verificationLevel = 5;

      await program.methods
        .registerIssuer(issuerName, verificationLevel)
        .accounts({
          config: configPda,
          issuer: issuerPda,
          identity: issuerIdentity.publicKey,
          authority: issuerAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([issuerAuthority])
        .rpc();

      const issuer = await program.account.credentialIssuer.fetch(issuerPda);
      expect(issuer.authority.toString()).to.equal(issuerAuthority.publicKey.toString());
      expect(issuer.identity.toString()).to.equal(issuerIdentity.publicKey.toString());
      expect(issuer.name).to.equal(issuerName);
      expect(issuer.verificationLevel).to.equal(verificationLevel);
      expect(issuer.credentialsIssued.toNumber()).to.equal(0);
      expect(issuer.credentialsRevoked.toNumber()).to.equal(0);
      expect(issuer.active).to.equal(true);
    });
  });

  describe("issue_credential", () => {
    // Setup: Need schema, issuer, and holder
    let schemaId: Uint8Array;
    let schemaPda: PublicKey;
    let schemaCreator: Keypair;
    let issuerAuthority: Keypair;
    let issuerPda: PublicKey;
    let holder: Keypair;
    let credentialId: Uint8Array;
    let credentialPda: PublicKey;

    before(async () => {
      // Create schema
      schemaId = generateId();
      schemaCreator = Keypair.generate();
      await airdrop(schemaCreator.publicKey, 5);

      [schemaPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("schema"), schemaId],
        program.programId
      );

      await program.methods
        .createSchema(
          Array.from(schemaId),
          "PANVerification",
          1,
          2, // requiredIssuerVerification
          false,
          true
        )
        .accounts({
          config: configPda,
          schema: schemaPda,
          creator: schemaCreator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([schemaCreator])
        .rpc();

      // Create issuer
      issuerAuthority = Keypair.generate();
      await airdrop(issuerAuthority.publicKey, 5);

      [issuerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("issuer"), issuerAuthority.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .registerIssuer("Income Tax Department", 3) // verification level 3 >= required 2
        .accounts({
          config: configPda,
          issuer: issuerPda,
          identity: Keypair.generate().publicKey,
          authority: issuerAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([issuerAuthority])
        .rpc();

      // Setup holder
      holder = Keypair.generate();
      credentialId = generateId();

      [credentialPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("credential"), credentialId],
        program.programId
      );
    });

    it("should issue a credential to a holder", async () => {
      const claimsHash = generateId();
      const metadataUri = "https://credentials.aadhaarchain.io/cred/123.json";

      await program.methods
        .issueCredential(
          Array.from(credentialId),
          Array.from(claimsHash),
          null, // Use default validity
          metadataUri
        )
        .accounts({
          config: configPda,
          schema: schemaPda,
          issuer: issuerPda,
          credential: credentialPda,
          holder: holder.publicKey,
          authority: issuerAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([issuerAuthority])
        .rpc();

      const credential = await program.account.credential.fetch(credentialPda);
      expect(credential.schema.toString()).to.equal(schemaPda.toString());
      expect(credential.holder.toString()).to.equal(holder.publicKey.toString());
      expect(credential.issuer.toString()).to.equal(issuerAuthority.publicKey.toString());
      expect(credential.metadataUri).to.equal(metadataUri);
      expect(Object.keys(credential.status)[0]).to.equal("active");

      // Verify issuer stats updated
      const issuer = await program.account.credentialIssuer.fetch(issuerPda);
      expect(issuer.credentialsIssued.toNumber()).to.equal(1);
    });

    it("should reject if issuer verification level is too low", async () => {
      // Create schema requiring high verification
      const highReqSchemaId = generateId();
      const [highReqSchemaPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("schema"), highReqSchemaId],
        program.programId
      );

      await program.methods
        .createSchema(
          Array.from(highReqSchemaId),
          "HighSecuritySchema",
          1,
          10, // Very high required verification
          false,
          true
        )
        .accounts({
          config: configPda,
          schema: highReqSchemaPda,
          creator: schemaCreator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([schemaCreator])
        .rpc();

      const newCredId = generateId();
      const [newCredPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("credential"), newCredId],
        program.programId
      );

      try {
        await program.methods
          .issueCredential(
            Array.from(newCredId),
            Array.from(generateId()),
            null,
            "https://example.com"
          )
          .accounts({
            config: configPda,
            schema: highReqSchemaPda,
            issuer: issuerPda, // Issuer has verification level 3
            credential: newCredPda,
            holder: holder.publicKey,
            authority: issuerAuthority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([issuerAuthority])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("InsufficientIssuerVerification");
      }
    });
  });

  describe("revoke_credential", () => {
    let schemaId: Uint8Array;
    let schemaPda: PublicKey;
    let issuerAuthority: Keypair;
    let issuerPda: PublicKey;
    let credentialId: Uint8Array;
    let credentialPda: PublicKey;

    before(async () => {
      // Create revocable schema
      schemaId = generateId();
      const schemaCreator = Keypair.generate();
      await airdrop(schemaCreator.publicKey, 5);

      [schemaPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("schema"), schemaId],
        program.programId
      );

      await program.methods
        .createSchema(
          Array.from(schemaId),
          "RevocableSchema",
          1,
          1,
          false,
          true // revocable
        )
        .accounts({
          config: configPda,
          schema: schemaPda,
          creator: schemaCreator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([schemaCreator])
        .rpc();

      // Create issuer
      issuerAuthority = Keypair.generate();
      await airdrop(issuerAuthority.publicKey, 5);

      [issuerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("issuer"), issuerAuthority.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .registerIssuer("Test Issuer", 2)
        .accounts({
          config: configPda,
          issuer: issuerPda,
          identity: Keypair.generate().publicKey,
          authority: issuerAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([issuerAuthority])
        .rpc();

      // Issue credential
      credentialId = generateId();
      [credentialPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("credential"), credentialId],
        program.programId
      );

      await program.methods
        .issueCredential(
          Array.from(credentialId),
          Array.from(generateId()),
          null,
          "https://example.com"
        )
        .accounts({
          config: configPda,
          schema: schemaPda,
          issuer: issuerPda,
          credential: credentialPda,
          holder: Keypair.generate().publicKey,
          authority: issuerAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([issuerAuthority])
        .rpc();
    });

    it("should revoke an active credential", async () => {
      const reason = "Document verification failed";

      await program.methods
        .revokeCredential(reason)
        .accounts({
          schema: schemaPda,
          issuer: issuerPda,
          credential: credentialPda,
          authority: issuerAuthority.publicKey,
        })
        .signers([issuerAuthority])
        .rpc();

      const credential = await program.account.credential.fetch(credentialPda);
      expect(Object.keys(credential.status)[0]).to.equal("revoked");
      expect(credential.revocationReason).to.equal(reason);
      expect(credential.revokedAt.toNumber()).to.be.greaterThan(0);

      // Verify issuer stats
      const issuer = await program.account.credentialIssuer.fetch(issuerPda);
      expect(issuer.credentialsRevoked.toNumber()).to.equal(1);
    });

    it("should reject revoking already revoked credential", async () => {
      try {
        await program.methods
          .revokeCredential("Double revoke")
          .accounts({
            schema: schemaPda,
            issuer: issuerPda,
            credential: credentialPda,
            authority: issuerAuthority.publicKey,
          })
          .signers([issuerAuthority])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.error.errorCode.code).to.equal("CredentialAlreadyRevoked");
      }
    });
  });

  describe("suspend_credential", () => {
    let schemaPda: PublicKey;
    let issuerAuthority: Keypair;
    let issuerPda: PublicKey;
    let credentialPda: PublicKey;

    before(async () => {
      const schemaId = generateId();
      const schemaCreator = Keypair.generate();
      await airdrop(schemaCreator.publicKey, 5);

      [schemaPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("schema"), schemaId],
        program.programId
      );

      await program.methods
        .createSchema(Array.from(schemaId), "SuspendableSchema", 1, 1, false, true)
        .accounts({
          config: configPda,
          schema: schemaPda,
          creator: schemaCreator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([schemaCreator])
        .rpc();

      issuerAuthority = Keypair.generate();
      await airdrop(issuerAuthority.publicKey, 5);

      [issuerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("issuer"), issuerAuthority.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .registerIssuer("Suspend Test Issuer", 2)
        .accounts({
          config: configPda,
          issuer: issuerPda,
          identity: Keypair.generate().publicKey,
          authority: issuerAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([issuerAuthority])
        .rpc();

      const credentialId = generateId();
      [credentialPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("credential"), credentialId],
        program.programId
      );

      await program.methods
        .issueCredential(Array.from(credentialId), Array.from(generateId()), null, "https://example.com")
        .accounts({
          config: configPda,
          schema: schemaPda,
          issuer: issuerPda,
          credential: credentialPda,
          holder: Keypair.generate().publicKey,
          authority: issuerAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([issuerAuthority])
        .rpc();
    });

    it("should suspend an active credential", async () => {
      await program.methods
        .suspendCredential()
        .accounts({
          issuer: issuerPda,
          credential: credentialPda,
          authority: issuerAuthority.publicKey,
        })
        .signers([issuerAuthority])
        .rpc();

      const credential = await program.account.credential.fetch(credentialPda);
      expect(Object.keys(credential.status)[0]).to.equal("suspended");
    });

    it("should reactivate a suspended credential", async () => {
      await program.methods
        .reactivateCredential()
        .accounts({
          issuer: issuerPda,
          credential: credentialPda,
          authority: issuerAuthority.publicKey,
        })
        .signers([issuerAuthority])
        .rpc();

      const credential = await program.account.credential.fetch(credentialPda);
      expect(Object.keys(credential.status)[0]).to.equal("active");
    });
  });

  describe("verify_credential", () => {
    let credentialPda: PublicKey;

    before(async () => {
      // Use an existing credential from previous tests
      const schemaId = generateId();
      const schemaCreator = Keypair.generate();
      await airdrop(schemaCreator.publicKey, 5);

      const [schemaPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("schema"), schemaId],
        program.programId
      );

      await program.methods
        .createSchema(Array.from(schemaId), "VerifyTestSchema", 1, 1, false, true)
        .accounts({
          config: configPda,
          schema: schemaPda,
          creator: schemaCreator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([schemaCreator])
        .rpc();

      const issuerAuthority = Keypair.generate();
      await airdrop(issuerAuthority.publicKey, 5);

      const [issuerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("issuer"), issuerAuthority.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .registerIssuer("Verify Test Issuer", 2)
        .accounts({
          config: configPda,
          issuer: issuerPda,
          identity: Keypair.generate().publicKey,
          authority: issuerAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([issuerAuthority])
        .rpc();

      const credentialId = generateId();
      [credentialPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("credential"), credentialId],
        program.programId
      );

      await program.methods
        .issueCredential(Array.from(credentialId), Array.from(generateId()), null, "https://example.com")
        .accounts({
          config: configPda,
          schema: schemaPda,
          issuer: issuerPda,
          credential: credentialPda,
          holder: Keypair.generate().publicKey,
          authority: issuerAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([issuerAuthority])
        .rpc();
    });

    it("should verify an active credential", async () => {
      const verifier = Keypair.generate();
      await airdrop(verifier.publicKey, 1);

      // This should not throw - just logs verification result
      await program.methods
        .verifyCredential()
        .accounts({
          credential: credentialPda,
          verifier: verifier.publicKey,
        })
        .signers([verifier])
        .rpc();
    });
  });

  describe("admin functions", () => {
    let schemaPda: PublicKey;
    let issuerPda: PublicKey;

    before(async () => {
      const schemaId = generateId();
      const schemaCreator = Keypair.generate();
      await airdrop(schemaCreator.publicKey, 5);

      [schemaPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("schema"), schemaId],
        program.programId
      );

      await program.methods
        .createSchema(Array.from(schemaId), "AdminTestSchema", 1, 1, false, true)
        .accounts({
          config: configPda,
          schema: schemaPda,
          creator: schemaCreator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([schemaCreator])
        .rpc();

      const issuerAuthority = Keypair.generate();
      await airdrop(issuerAuthority.publicKey, 5);

      [issuerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("issuer"), issuerAuthority.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .registerIssuer("Admin Test Issuer", 2)
        .accounts({
          config: configPda,
          issuer: issuerPda,
          identity: Keypair.generate().publicKey,
          authority: issuerAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([issuerAuthority])
        .rpc();
    });

    it("should deactivate a schema (admin only)", async () => {
      await program.methods
        .deactivateSchema()
        .accounts({
          config: configPda,
          schema: schemaPda,
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc();

      const schema = await program.account.credentialSchema.fetch(schemaPda);
      expect(schema.active).to.equal(false);
    });

    it("should deactivate an issuer (admin only)", async () => {
      await program.methods
        .deactivateIssuer()
        .accounts({
          config: configPda,
          issuer: issuerPda,
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc();

      const issuer = await program.account.credentialIssuer.fetch(issuerPda);
      expect(issuer.active).to.equal(false);
    });

    it("should update config (admin only)", async () => {
      const newDefaultValidity = 86400 * 180; // 180 days
      const newMaxValidity = 86400 * 365 * 3; // 3 years

      await program.methods
        .updateConfig(
          new anchor.BN(newDefaultValidity),
          new anchor.BN(newMaxValidity)
        )
        .accounts({
          config: configPda,
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc();

      const config = await program.account.credentialConfig.fetch(configPda);
      expect(config.defaultValidityPeriod.toNumber()).to.equal(newDefaultValidity);
      expect(config.maxValidityPeriod.toNumber()).to.equal(newMaxValidity);
    });

    it("should reject non-admin config update", async () => {
      const nonAdmin = Keypair.generate();
      await airdrop(nonAdmin.publicKey, 1);

      try {
        await program.methods
          .updateConfig(new anchor.BN(100), null)
          .accounts({
            config: configPda,
            admin: nonAdmin.publicKey,
          })
          .signers([nonAdmin])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        // Anchor constraint error
        expect(error.message).to.include("A has_one constraint was violated");
      }
    });
  });
});
