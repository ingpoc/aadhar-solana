/**
 * IdentityService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { IdentityService } from '../../modules/identity/identity.service';
import { DatabaseService } from '../../services/database.service';
import { SolanaService } from '../../services/solana.service';
import { CacheService } from '../../services/cache.service';
import { prismaMock, mockIdentity, mockUser } from '../mocks';
import { createSolanaServiceMock } from '../mocks/solana.mock';
import { createCacheServiceMock } from '../mocks/cache.mock';
import { createIdentityFixture, createUserFixture } from '../fixtures';

describe('IdentityService', () => {
  let service: IdentityService;
  let databaseService: DatabaseService;
  let solanaService: ReturnType<typeof createSolanaServiceMock>;
  let cacheService: ReturnType<typeof createCacheServiceMock>;

  beforeEach(async () => {
    solanaService = createSolanaServiceMock();
    cacheService = createCacheServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentityService,
        { provide: DatabaseService, useValue: prismaMock },
        { provide: SolanaService, useValue: solanaService },
        { provide: CacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<IdentityService>(IdentityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    cacheService._clear();
  });

  describe('createIdentity', () => {
    const createIdentityDto = {
      publicKey: 'TestPublicKey123456789012345678901234567890123',
      did: 'did:aadhaar:TestPublicKey123',
      metadataUri: 'https://example.com/metadata.json',
      email: 'test@example.com',
      phone: '9876543210',
      recoveryKeys: [],
    };

    it('should create a new identity successfully', async () => {
      const identity = createIdentityFixture({
        solanaPublicKey: createIdentityDto.publicKey,
        did: createIdentityDto.did,
        metadataUri: createIdentityDto.metadataUri,
      });

      const user = createUserFixture({
        email: createIdentityDto.email,
        phone: createIdentityDto.phone,
        identityId: identity.id,
      });

      prismaMock.identity.create.mockResolvedValue({
        ...identity,
        user,
      });

      solanaService.createIdentityAccount = jest.fn().mockResolvedValue('mock-tx-signature');

      const result = await service.createIdentity(createIdentityDto);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('identityId');
      expect(result.data).toHaveProperty('did', createIdentityDto.did);
      expect(result.data).toHaveProperty('transactionSignature', 'mock-tx-signature');
      expect(prismaMock.identity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          solanaPublicKey: createIdentityDto.publicKey,
          did: createIdentityDto.did,
        }),
        include: { user: true },
      });
    });

    it('should call Solana service to create on-chain account', async () => {
      const identity = createIdentityFixture();
      prismaMock.identity.create.mockResolvedValue({
        ...identity,
        user: createUserFixture(),
      });
      solanaService.createIdentityAccount = jest.fn().mockResolvedValue('tx-sig-123');

      await service.createIdentity(createIdentityDto);

      expect(solanaService.createIdentityAccount).toHaveBeenCalledWith(
        createIdentityDto.publicKey,
        createIdentityDto.did,
        createIdentityDto.metadataUri,
        createIdentityDto.recoveryKeys
      );
    });
  });

  describe('getIdentity', () => {
    const identityId = 'test-identity-id';

    it('should return cached identity if available', async () => {
      const cachedData = {
        identityId,
        did: 'did:aadhaar:cached',
        publicKey: 'CachedPublicKey',
        verificationStatus: { aadhaar: 'verified' },
        reputationScore: 600,
      };

      await cacheService.set(`identity:${identityId}`, cachedData);

      const result = await service.getIdentity(identityId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(cachedData);
      expect(prismaMock.identity.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database if not cached', async () => {
      const identity = {
        ...mockIdentity,
        id: identityId,
        verificationRequests: [],
        credentials: [],
        user: mockUser,
        verificationBitmap: BigInt(1),
        stakedAmount: BigInt(1000000000),
      };

      prismaMock.identity.findUnique.mockResolvedValue(identity);
      solanaService.getIdentityAccount = jest.fn().mockResolvedValue({
        authority: identity.solanaPublicKey,
        did: identity.did,
        verificationBitmap: 1,
        reputationScore: 500,
      });

      const result = await service.getIdentity(identityId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('identityId', identityId);
      expect(result.data).toHaveProperty('did', identity.did);
      expect(result.data).toHaveProperty('verificationStatus');
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent identity', async () => {
      prismaMock.identity.findUnique.mockResolvedValue(null);

      await expect(service.getIdentity('non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should correctly parse verification bitmap', async () => {
      const identity = {
        ...mockIdentity,
        id: identityId,
        verificationBitmap: BigInt(3), // Aadhaar (1) + PAN (2)
        verificationRequests: [],
        credentials: [],
        user: mockUser,
        stakedAmount: BigInt(0),
      };

      prismaMock.identity.findUnique.mockResolvedValue(identity);
      solanaService.getIdentityAccount = jest.fn().mockResolvedValue({});

      const result = await service.getIdentity(identityId);

      expect(result.data.verificationStatus).toEqual({
        aadhaar: 'verified',
        pan: 'verified',
        education: 'pending',
      });
    });

    it('should include on-chain data from Solana', async () => {
      const identity = {
        ...mockIdentity,
        id: identityId,
        verificationRequests: [],
        credentials: [],
        user: mockUser,
        verificationBitmap: BigInt(0),
        stakedAmount: BigInt(0),
      };

      const onChainData = {
        authority: identity.solanaPublicKey,
        did: identity.did,
        verificationBitmap: 0,
        reputationScore: 750,
        stakedAmount: 5000000000,
      };

      prismaMock.identity.findUnique.mockResolvedValue(identity);
      solanaService.getIdentityAccount = jest.fn().mockResolvedValue(onChainData);

      const result = await service.getIdentity(identityId);

      expect(result.data.onChainData).toEqual(onChainData);
    });
  });

  describe('updateIdentity', () => {
    const identityId = 'test-identity-id';

    it('should update identity metadata successfully', async () => {
      const updateDto = {
        metadataUri: 'https://example.com/new-metadata.json',
      };

      prismaMock.identity.findUnique.mockResolvedValue(mockIdentity);
      prismaMock.identity.update.mockResolvedValue({
        ...mockIdentity,
        metadataUri: updateDto.metadataUri,
      });

      const result = await service.updateIdentity(identityId, updateDto);

      expect(result.success).toBe(true);
      expect(result.data.metadataUri).toBe(updateDto.metadataUri);
    });

    it('should invalidate cache after update', async () => {
      prismaMock.identity.findUnique.mockResolvedValue(mockIdentity);
      prismaMock.identity.update.mockResolvedValue(mockIdentity);

      await service.updateIdentity(identityId, { metadataUri: 'new-uri' });

      expect(cacheService.del).toHaveBeenCalledWith(`identity:${identityId}`);
    });

    it('should throw NotFoundException for non-existent identity', async () => {
      prismaMock.identity.findUnique.mockResolvedValue(null);

      await expect(
        service.updateIdentity('non-existent-id', { metadataUri: 'test' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('edge cases', () => {
    it('should handle identity with no credentials', async () => {
      const identity = {
        ...mockIdentity,
        id: 'no-creds-id',
        credentials: [],
        verificationRequests: [],
        user: mockUser,
        verificationBitmap: BigInt(0),
        stakedAmount: BigInt(0),
      };

      prismaMock.identity.findUnique.mockResolvedValue(identity);
      solanaService.getIdentityAccount = jest.fn().mockResolvedValue({});

      const result = await service.getIdentity('no-creds-id');

      expect(result.success).toBe(true);
    });

    it('should handle Solana service failure gracefully', async () => {
      const identity = {
        ...mockIdentity,
        verificationRequests: [],
        credentials: [],
        user: mockUser,
        verificationBitmap: BigInt(0),
        stakedAmount: BigInt(0),
      };

      prismaMock.identity.findUnique.mockResolvedValue(identity);
      solanaService.getIdentityAccount = jest.fn().mockRejectedValue(
        new Error('Network error')
      );

      await expect(service.getIdentity(identity.id)).rejects.toThrow('Network error');
    });
  });
});
