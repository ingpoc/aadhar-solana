import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";

const BPF_LOADER_UPGRADEABLE_PROGRAM_ID = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111"
);

describe("upgrade-authority", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const programs = [
    ["identity-registry", anchor.workspace.IdentityRegistry.programId],
    ["verification-oracle", anchor.workspace.VerificationOracle.programId],
    ["credential-manager", anchor.workspace.CredentialManager.programId],
    ["reputation-engine", anchor.workspace.ReputationEngine.programId],
    ["staking-manager", anchor.workspace.StakingManager.programId],
  ] as const;

  it("should expose upgradeable loader metadata for every deployed program", async () => {
    for (const [name, programId] of programs) {
      const programAccount = await provider.connection.getAccountInfo(programId);
      expect(programAccount, `${name} program account`).to.not.be.null;
      expect(programAccount!.owner.toString(), `${name} loader owner`).to.equal(
        BPF_LOADER_UPGRADEABLE_PROGRAM_ID.toString()
      );
      expect(programAccount!.data.readUInt32LE(0), `${name} loader state`).to.equal(2);

      const programDataAddress = new PublicKey(programAccount!.data.subarray(4, 36));
      const programDataAccount = await provider.connection.getAccountInfo(programDataAddress);
      expect(programDataAccount, `${name} program data account`).to.not.be.null;
      expect(programDataAccount!.data.readUInt32LE(0), `${name} program data state`).to.equal(3);

      expect(programDataAccount!.data.length, `${name} program data metadata`).to.be.greaterThan(
        12
      );
    }
  });
});
