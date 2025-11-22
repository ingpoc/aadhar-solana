/**
 * CredentialsService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CredentialsService } from '../../modules/credentials/credentials.service';
import { DatabaseService } from '../../services/database.service';
import { SolanaService } from '../../services/solana.service';
import { prismaMock, mockIdentity, mockCredential } from '../mocks';
import { createSolanaServiceMock } from '../mocks/solana.mock';
import { createIdentityFixture, createCredentialFixture } from '../fixtures';

describe('CredentialsService', () => {
  let service: CredentialsService;
  let databaseService: DatabaseService;
  let solanaService: ReturnType<typeof createSolanaServiceMock>;

  beforeEach(async () => {
    solanaService = createSolanaServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialsService,
        { provide: DatabaseService, useValue: prismaMock },
        { provide: SolanaService, useValue: solanaService },
      ],
    }).compile();

    service = module.get<CredentialsService>(CredentialsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('issueCredential', () => {
    const issueDto = {
      subjectId: 'test-identity-id',
      credentialType: 'AadhaarVerification',
      claims: {
        verified: true,
        verificationDate: '2024-01-01',
        verificationLevel: 'full',
      },
      expiresAt: '2025-01-01',
    };

    it('should issue a credential successfully', async () => {
      const identity = createIdentityFixture({ id: issueDto.subjectId });
      const credential = createCredentialFixture({
        identityId: issueDto.subjectId,
        credentialType: issueDto.credentialType,
      });

      prismaMock.identity.findUnique.mockResolvedValue(identity);
      prismaMock.credential.create.mockResolvedValue(credential);
      solanaService.issueCredential = jest.fn().mockResolvedValue('mock-tx-signature');

      const result = await service.issueCredential(issueDto);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('credentialId');
      expect(result.data).toHaveProperty('credentialType', issueDto.credentialType);
      expect(result.data).toHaveProperty('transactionSignature', 'mock-tx-signature');
    });

    it('should throw NotFoundException for non-existent identity', async () => {
      prismaMock.identity.findUnique.mockResolvedValue(null);

      await expect(service.issueCredential(issueDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should store claims as metadata', async () => {
      const identity = createIdentityFixture({ id: issueDto.subjectId });
      prismaMock.identity.findUnique.mockResolvedValue(identity);
      prismaMock.credential.create.mockResolvedValue(createCredentialFixture());
      solanaService.issueCredential = jest.fn().mockResolvedValue('sig');

      await service.issueCredential(issueDto);

      expect(prismaMock.credential.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadataUri: JSON.stringify(issueDto.claims),
        }),
      });
    });

    it('should handle credential without expiration', async () => {
      const dtoWithoutExpiry = { ...issueDto, expiresAt: undefined };
      const identity = createIdentityFixture({ id: dtoWithoutExpiry.subjectId });

      prismaMock.identity.findUnique.mockResolvedValue(identity);
      prismaMock.credential.create.mockResolvedValue(createCredentialFixture({ expiresAt: null }));
      solanaService.issueCredential = jest.fn().mockResolvedValue('sig');

      const result = await service.issueCredential(dtoWithoutExpiry);

      expect(result.success).toBe(true);
      expect(prismaMock.credential.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt: null,
        }),
      });
    });

    it('should call Solana service to record on-chain', async () => {
      const identity = createIdentityFixture({ id: issueDto.subjectId });
      prismaMock.identity.findUnique.mockResolvedValue(identity);
      prismaMock.credential.create.mockResolvedValue(createCredentialFixture());
      solanaService.issueCredential = jest.fn().mockResolvedValue('tx-sig');

      await service.issueCredential(issueDto);

      expect(solanaService.issueCredential).toHaveBeenCalledWith(
        issueDto.subjectId,
        issueDto.credentialType,
        issueDto.claims
      );
    });
  });

  describe('getCredential', () => {
    const credentialId = 'cred_123456';

    it('should return credential data successfully', async () => {
      const credential = {
        ...mockCredential,
        credentialId,
        metadataUri: JSON.stringify({ verified: true }),
        identity: mockIdentity,
      };

      prismaMock.credential.findUnique.mockResolvedValue(credential);

      const result = await service.getCredential(credentialId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('credentialId', credentialId);
      expect(result.data).toHaveProperty('claims');
      expect(result.data.claims).toEqual({ verified: true });
    });

    it('should throw NotFoundException for non-existent credential', async () => {
      prismaMock.credential.findUnique.mockResolvedValue(null);

      await expect(service.getCredential('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should mark revoked credentials as not verifiable', async () => {
      const revokedCredential = {
        ...mockCredential,
        credentialId,
        revoked: true,
        revokedAt: new Date(),
        metadataUri: '{}',
        identity: mockIdentity,
      };

      prismaMock.credential.findUnique.mockResolvedValue(revokedCredential);

      const result = await service.getCredential(credentialId);

      expect(result.data.revoked).toBe(true);
      expect(result.data.verifiable).toBe(false);
    });

    it('should handle empty claims metadata', async () => {
      const credential = {
        ...mockCredential,
        credentialId,
        metadataUri: null,
        identity: mockIdentity,
      };

      prismaMock.credential.findUnique.mockResolvedValue(credential);

      const result = await service.getCredential(credentialId);

      expect(result.data.claims).toEqual({});
    });
  });

  describe('verifyCredential', () => {
    const credentialId = 'cred_verify_test';

    it('should return valid for active credential', async () => {
      const validCredential = createCredentialFixture({
        credentialId,
        revoked: false,
        expiresAt: new Date(Date.now() + 86400000), // Tomorrow
      });

      prismaMock.credential.findUnique.mockResolvedValue(validCredential);

      const result = await service.verifyCredential(credentialId);

      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(true);
      expect(result.data.revoked).toBe(false);
      expect(result.data.expired).toBeFalsy();
    });

    it('should return invalid for revoked credential', async () => {
      const revokedCredential = createCredentialFixture({
        credentialId,
        revoked: true,
        revokedAt: new Date(),
      });

      prismaMock.credential.findUnique.mockResolvedValue(revokedCredential);

      const result = await service.verifyCredential(credentialId);

      expect(result.data.valid).toBe(false);
      expect(result.data.revoked).toBe(true);
    });

    it('should return invalid for expired credential', async () => {
      const expiredCredential = createCredentialFixture({
        credentialId,
        revoked: false,
        expiresAt: new Date(Date.now() - 86400000), // Yesterday
      });

      prismaMock.credential.findUnique.mockResolvedValue(expiredCredential);

      const result = await service.verifyCredential(credentialId);

      expect(result.data.valid).toBe(false);
      expect(result.data.expired).toBe(true);
    });

    it('should throw NotFoundException for non-existent credential', async () => {
      prismaMock.credential.findUnique.mockResolvedValue(null);

      await expect(service.verifyCredential('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should include verification metadata', async () => {
      const credential = createCredentialFixture({ credentialId });
      prismaMock.credential.findUnique.mockResolvedValue(credential);

      const result = await service.verifyCredential(credentialId);

      expect(result.data).toHaveProperty('issuerVerified', true);
      expect(result.data).toHaveProperty('signatureValid', true);
      expect(result.data).toHaveProperty('verifiedAt');
    });
  });

  describe('revokeCredential', () => {
    const credentialId = 'cred_to_revoke';

    it('should revoke credential successfully', async () => {
      const credential = createCredentialFixture({ credentialId, revoked: false });

      prismaMock.credential.findUnique.mockResolvedValue(credential);
      prismaMock.credential.update.mockResolvedValue({
        ...credential,
        revoked: true,
        revokedAt: new Date(),
      });

      const result = await service.revokeCredential(credentialId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('revoked successfully');
      expect(prismaMock.credential.update).toHaveBeenCalledWith({
        where: { credentialId },
        data: {
          revoked: true,
          revokedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException for non-existent credential', async () => {
      prismaMock.credential.findUnique.mockResolvedValue(null);

      await expect(service.revokeCredential('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should handle already revoked credential', async () => {
      const alreadyRevoked = createCredentialFixture({
        credentialId,
        revoked: true,
        revokedAt: new Date(),
      });

      prismaMock.credential.findUnique.mockResolvedValue(alreadyRevoked);
      prismaMock.credential.update.mockResolvedValue(alreadyRevoked);

      // Should still succeed (idempotent operation)
      const result = await service.revokeCredential(credentialId);

      expect(result.success).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should generate unique credential IDs', async () => {
      const identity = createIdentityFixture();
      prismaMock.identity.findUnique.mockResolvedValue(identity);

      const credentialIds: string[] = [];

      for (let i = 0; i < 3; i++) {
        prismaMock.credential.create.mockImplementation(async (args) => ({
          ...createCredentialFixture(),
          credentialId: args.data.credentialId,
        }));
        solanaService.issueCredential = jest.fn().mockResolvedValue('sig');

        await service.issueCredential({
          subjectId: identity.id,
          credentialType: 'Test',
          claims: {},
        });

        const call = prismaMock.credential.create.mock.calls[i];
        credentialIds.push(call[0].data.credentialId);
      }

      // All IDs should be unique
      const uniqueIds = new Set(credentialIds);
      expect(uniqueIds.size).toBe(credentialIds.length);
    });
  });
});
