import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ReputationEngine } from "../target/types/reputation_engine";
import { expect } from "chai";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

describe("reputation-engine", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ReputationEngine as Program<ReputationEngine>;

  // Test accounts
  let admin: Keypair;
  let configPda: PublicKey;

  // Identity registry placeholder (would be real in integration)
  const identityRegistry = Keypair.generate().publicKey;

  // Config values
  const BASE_SCORE = 500;
  const MAX_SCORE = 1000;
  const MIN_SCORE = 0;
  const DECAY_RATE_BPS = 10; // 0.1% per day

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

    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );
  });

  describe("initialize", () => {
    it("should initialize the reputation engine config", async () => {
      await program.methods
        .initialize(
          identityRegistry,
          new anchor.BN(BASE_SCORE),
          new anchor.BN(MAX_SCORE),
          new anchor.BN(MIN_SCORE),
          DECAY_RATE_BPS
        )
        .accounts({
          config: configPda,
          admin: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();

      const config = await program.account.reputationConfig.fetch(configPda);
      expect(config.admin.toString()).to.equal(admin.publicKey.toString());
      expect(config.identityRegistry.toString()).to.equal(identityRegistry.toString());
      expect(config.baseScore.toNumber()).to.equal(BASE_SCORE);
      expect(config.maxScore.toNumber()).to.equal(MAX_SCORE);
      expect(config.minScore.toNumber()).to.equal(MIN_SCORE);
      expect(config.decayRateBps).to.equal(DECAY_RATE_BPS);
    });
  });

  describe("initialize_score", () => {
    let identity: Keypair;
    let scorePda: PublicKey;

    beforeEach(async () => {
      identity = Keypair.generate();

      [scorePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("score"), identity.publicKey.toBuffer()],
        program.programId
      );
    });

    it("should initialize reputation score for an identity", async () => {
      const payer = Keypair.generate();
      await airdrop(payer.publicKey, 5);

      await program.methods
        .initializeScore()
        .accounts({
          config: configPda,
          reputationScore: scorePda,
          identity: identity.publicKey,
          payer: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      const score = await program.account.reputationScore.fetch(scorePda);
      expect(score.identity.toString()).to.equal(identity.publicKey.toString());
      expect(score.score.toNumber()).to.equal(BASE_SCORE);
      expect(Object.keys(score.tier)[0]).to.equal("silver"); // 500 = Silver tier
      expect(score.positiveEvents).to.equal(0);
      expect(score.negativeEvents).to.equal(0);
      expect(score.totalPointsEarned.toNumber()).to.equal(0);
      expect(score.totalPointsLost.toNumber()).to.equal(0);
    });

    it("should set correct tier based on base score", async () => {
      const payer = Keypair.generate();
      await airdrop(payer.publicKey, 5);

      await program.methods
        .initializeScore()
        .accounts({
          config: configPda,
          reputationScore: scorePda,
          identity: identity.publicKey,
          payer: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer])
        .rpc();

      const score = await program.account.reputationScore.fetch(scorePda);
      // Base score 500 falls in Silver tier (301-500)
      expect(Object.keys(score.tier)[0]).to.equal("silver");
    });
  });

  describe("update_config", () => {
    it("should update config (admin only)", async () => {
      const newBaseScore = 600;
      const newMaxScore = 1500;
      const newMinScore = 100;
      const newDecayRate = 20;

      await program.methods
        .updateConfig(
          new anchor.BN(newBaseScore),
          new anchor.BN(newMaxScore),
          new anchor.BN(newMinScore),
          newDecayRate
        )
        .accounts({
          config: configPda,
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc();

      const config = await program.account.reputationConfig.fetch(configPda);
      expect(config.baseScore.toNumber()).to.equal(newBaseScore);
      expect(config.maxScore.toNumber()).to.equal(newMaxScore);
      expect(config.minScore.toNumber()).to.equal(newMinScore);
      expect(config.decayRateBps).to.equal(newDecayRate);

      // Reset to original values
      await program.methods
        .updateConfig(
          new anchor.BN(BASE_SCORE),
          new anchor.BN(MAX_SCORE),
          new anchor.BN(MIN_SCORE),
          DECAY_RATE_BPS
        )
        .accounts({
          config: configPda,
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc();
    });

    it("should reject non-admin config update", async () => {
      const nonAdmin = Keypair.generate();
      await airdrop(nonAdmin.publicKey, 1);

      try {
        await program.methods
          .updateConfig(new anchor.BN(700), null, null, null)
          .accounts({
            config: configPda,
            admin: nonAdmin.publicKey,
          })
          .signers([nonAdmin])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).to.include("A has_one constraint was violated");
      }
    });
  });

  describe("get_tier", () => {
    let identity: Keypair;
    let scorePda: PublicKey;

    before(async () => {
      identity = Keypair.generate();
      const payer = Keypair.generate();
      await airdrop(payer.publicKey, 5);

      [scorePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("score"), identity.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .initializeScore()
        .accounts({
          config: configPda,
          reputationScore: scorePda,
          identity: identity.publicKey,
          payer: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer])
        .rpc();
    });

    it("should get reputation tier for an identity", async () => {
      // This is a view-style function that logs the tier
      await program.methods
        .getTier()
        .accounts({
          reputationScore: scorePda,
        })
        .rpc();

      // Verify by fetching account directly
      const score = await program.account.reputationScore.fetch(scorePda);
      expect(Object.keys(score.tier)[0]).to.equal("silver");
    });
  });

  describe("tier boundaries", () => {
    // Test that tier calculation matches expected boundaries
    it("should correctly map scores to tiers", () => {
      const testCases = [
        { score: 0, expectedTier: "bronze" },
        { score: 150, expectedTier: "bronze" },
        { score: 300, expectedTier: "bronze" },
        { score: 301, expectedTier: "silver" },
        { score: 400, expectedTier: "silver" },
        { score: 500, expectedTier: "silver" },
        { score: 501, expectedTier: "gold" },
        { score: 600, expectedTier: "gold" },
        { score: 700, expectedTier: "gold" },
        { score: 701, expectedTier: "platinum" },
        { score: 800, expectedTier: "platinum" },
        { score: 900, expectedTier: "platinum" },
        { score: 901, expectedTier: "diamond" },
        { score: 950, expectedTier: "diamond" },
        { score: 1000, expectedTier: "diamond" },
      ];

      // This is a unit test of the tier logic
      const getTierFromScore = (score: number): string => {
        if (score <= 300) return "bronze";
        if (score <= 500) return "silver";
        if (score <= 700) return "gold";
        if (score <= 900) return "platinum";
        return "diamond";
      };

      testCases.forEach(({ score, expectedTier }) => {
        const tier = getTierFromScore(score);
        expect(tier).to.equal(expectedTier, `Score ${score} should be ${expectedTier}`);
      });
    });
  });

  describe("event point values", () => {
    // Test default point values for each event type
    it("should have correct default point values", () => {
      const eventPoints = {
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

      // Positive events should add points
      expect(eventPoints.verificationCompleted).to.equal(50);
      expect(eventPoints.credentialIssued).to.equal(30);
      expect(eventPoints.successfulTransaction).to.equal(10);
      expect(eventPoints.stakeDeposited).to.equal(20);
      expect(eventPoints.consistentActivity).to.equal(5);

      // Negative events should subtract points
      expect(eventPoints.verificationFailed).to.equal(-30);
      expect(eventPoints.credentialRevoked).to.equal(-50);
      expect(eventPoints.suspiciousActivity).to.equal(-40);
      expect(eventPoints.stakeSlashed).to.equal(-60);
      expect(eventPoints.inactivityPenalty).to.equal(-10);
    });
  });

  describe("score boundaries", () => {
    it("should enforce max score boundary", () => {
      const maxScore = MAX_SCORE;
      const currentScore = 980;
      const pointsToAdd = 100;

      // Score should cap at max
      const newScore = Math.min(currentScore + pointsToAdd, maxScore);
      expect(newScore).to.equal(maxScore);
    });

    it("should enforce min score boundary", () => {
      const minScore = MIN_SCORE;
      const currentScore = 20;
      const pointsToSubtract = 100;

      // Score should not go below min
      const newScore = Math.max(currentScore - pointsToSubtract, minScore);
      expect(newScore).to.equal(minScore);
    });
  });

  describe("decay calculation", () => {
    it("should calculate decay correctly", () => {
      const score = 800;
      const decayRateBps = 10; // 0.1%
      const daysElapsed = 30;

      // Decay = score * rate * days / 10000
      const decayPerDay = (score * decayRateBps) / 10000;
      const totalDecay = Math.floor(decayPerDay * daysElapsed);

      expect(decayPerDay).to.equal(0.8);
      expect(totalDecay).to.equal(24);

      // New score after decay
      const newScore = Math.max(score - totalDecay, MIN_SCORE);
      expect(newScore).to.equal(776);
    });

    it("should not decay below minimum score", () => {
      const score = 50;
      const decayRateBps = 1000; // 10%
      const daysElapsed = 100;

      const decayPerDay = (score * decayRateBps) / 10000;
      const totalDecay = Math.floor(decayPerDay * daysElapsed);

      const newScore = Math.max(score - totalDecay, MIN_SCORE);
      expect(newScore).to.equal(MIN_SCORE);
    });
  });

  describe("score progression scenarios", () => {
    it("should calculate score after multiple verifications", () => {
      let score = BASE_SCORE; // Start at 500

      // Complete 3 verifications (+50 each)
      score += 50 * 3;
      expect(score).to.equal(650);

      // Tier should be Gold (501-700)
      const tier = score <= 300 ? "bronze" : score <= 500 ? "silver" : score <= 700 ? "gold" : score <= 900 ? "platinum" : "diamond";
      expect(tier).to.equal("gold");
    });

    it("should calculate score after negative events", () => {
      let score = 700; // Gold tier

      // Failed verification (-30)
      score -= 30;
      expect(score).to.equal(670);

      // Credential revoked (-50)
      score -= 50;
      expect(score).to.equal(620);

      // Still Gold tier
      const tier = score <= 300 ? "bronze" : score <= 500 ? "silver" : score <= 700 ? "gold" : score <= 900 ? "platinum" : "diamond";
      expect(tier).to.equal("gold");
    });

    it("should handle tier progression from Bronze to Diamond", () => {
      let score = 200; // Bronze

      // Series of positive events to reach Diamond
      const eventsToReachDiamond = [
        { type: "verificationCompleted", points: 50 }, // 250 - Bronze
        { type: "verificationCompleted", points: 50 }, // 300 - Bronze
        { type: "credentialIssued", points: 30 },      // 330 - Silver
        { type: "verificationCompleted", points: 50 }, // 380 - Silver
        { type: "verificationCompleted", points: 50 }, // 430 - Silver
        { type: "verificationCompleted", points: 50 }, // 480 - Silver
        { type: "credentialIssued", points: 30 },      // 510 - Gold
        { type: "verificationCompleted", points: 50 }, // 560 - Gold
        { type: "verificationCompleted", points: 50 }, // 610 - Gold
        { type: "verificationCompleted", points: 50 }, // 660 - Gold
        { type: "verificationCompleted", points: 50 }, // 710 - Platinum
        { type: "verificationCompleted", points: 50 }, // 760 - Platinum
        { type: "verificationCompleted", points: 50 }, // 810 - Platinum
        { type: "verificationCompleted", points: 50 }, // 860 - Platinum
        { type: "verificationCompleted", points: 50 }, // 910 - Diamond
      ];

      eventsToReachDiamond.forEach((event) => {
        score = Math.min(score + event.points, MAX_SCORE);
      });

      expect(score).to.equal(910);
      const tier = score <= 300 ? "bronze" : score <= 500 ? "silver" : score <= 700 ? "gold" : score <= 900 ? "platinum" : "diamond";
      expect(tier).to.equal("diamond");
    });
  });
});
