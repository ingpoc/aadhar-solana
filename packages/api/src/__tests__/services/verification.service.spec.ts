/**
 * VerificationService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VerificationService } from '../../modules/verification/verification.service';
import { DatabaseService } from '../../services/database.service';
import { ApiSetuService } from '../../services/api-setu.service';
import { SolanaService } from '../../services/solana.service';
import { prismaMock, mockIdentity, mockVerification } from '../mocks';
import { createSolanaServiceMock } from '../mocks/solana.mock';
import { createIdentityFixture, createVerificationFixture } from '../fixtures';

describe('VerificationService', () => {
  let service: VerificationService;
  let solanaService: ReturnType<typeof createSolanaServiceMock>;
  let apiSetuService: any;

  beforeEach(async () => {
    jest.useFakeTimers();

    solanaService = createSolanaServiceMock();
    apiSetuService = {
      verifyAadhaar: jest.fn(),
      verifyPAN: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        { provide: DatabaseService, useValue: prismaMock },
        { provide: ApiSetuService, useValue: apiSetuService },
        { provide: SolanaService, useValue: solanaService },
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('requestAadhaarVerification', () => {
    const aadhaarDto = {
      identityId: 'test-identity-id',
      aadhaarNumber: '123456789012',
      consent: true,
    };

    it('should create a pending verification request', async () => {
      const identity = createIdentityFixture({ id: aadhaarDto.identityId });
      const verificationRequest = createVerificationFixture({
        identityId: aadhaarDto.identityId,
        verificationType: 'AADHAAR',
        status: 'PENDING',
      });

      prismaMock.identity.findUnique.mockResolvedValue(identity);
      prismaMock.verificationRequest.create.mockResolvedValue(verificationRequest);

      const result = await service.requestAadhaarVerification(aadhaarDto);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('verificationId');
      expect(result.data).toHaveProperty('status', 'pending');
      expect(result.data).toHaveProperty('estimatedCompletionTime');
    });

    it('should throw NotFoundException for non-existent identity', async () => {
      prismaMock.identity.findUnique.mockResolvedValue(null);

      await expect(service.requestAadhaarVerification(aadhaarDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should schedule async verification with API Setu', async () => {
      const identity = createIdentityFixture({ id: aadhaarDto.identityId });
      const verificationRequest = createVerificationFixture({
        identityId: aadhaarDto.identityId,
        verificationType: 'AADHAAR',
      });

      prismaMock.identity.findUnique.mockResolvedValue(identity);
      prismaMock.verificationRequest.create.mockResolvedValue(verificationRequest);
      apiSetuService.verifyAadhaar.mockResolvedValue({
        verified: true,
        verificationHash: 'hash123',
        requestId: 'req123',
      });
      prismaMock.verificationRequest.update.mockResolvedValue(verificationRequest);
      prismaMock.identity.update.mockResolvedValue(identity);
      solanaService.updateVerificationStatus = jest.fn().mockResolvedValue('sig');

      await service.requestAadhaarVerification(aadhaarDto);

      // Fast-forward past the setTimeout
      jest.advanceTimersByTime(1100);

      // Allow promises to resolve
      await Promise.resolve();

      expect(apiSetuService.verifyAadhaar).toHaveBeenCalledWith(
        aadhaarDto.aadhaarNumber,
        aadhaarDto.consent
      );
    });

    it('should update verification status on successful verification', async () => {
      const identity = createIdentityFixture({
        id: aadhaarDto.identityId,
        verificationBitmap: 0,
      });
      const verificationRequest = createVerificationFixture({
        id: 'ver-id',
        identityId: aadhaarDto.identityId,
      });

      prismaMock.identity.findUnique.mockResolvedValue(identity);
      prismaMock.verificationRequest.create.mockResolvedValue(verificationRequest);
      apiSetuService.verifyAadhaar.mockResolvedValue({
        verified: true,
        verificationHash: 'verified-hash',
        requestId: 'api-req-id',
      });
      prismaMock.verificationRequest.update.mockResolvedValue(verificationRequest);
      prismaMock.identity.update.mockResolvedValue(identity);
      solanaService.updateVerificationStatus = jest.fn().mockResolvedValue('sig');

      await service.requestAadhaarVerification(aadhaarDto);

      jest.advanceTimersByTime(1100);
      await Promise.resolve();
      await Promise.resolve();

      expect(prismaMock.verificationRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: verificationRequest.id },
          data: expect.objectContaining({
            status: 'completed',
          }),
        })
      );
    });

    it('should set verification expiry time correctly', async () => {
      const identity = createIdentityFixture({ id: aadhaarDto.identityId });

      prismaMock.identity.findUnique.mockResolvedValue(identity);
      prismaMock.verificationRequest.create.mockImplementation(async (args) => ({
        ...createVerificationFixture(),
        expiresAt: args.data.expiresAt,
      }));

      await service.requestAadhaarVerification(aadhaarDto);

      const createCall = prismaMock.verificationRequest.create.mock.calls[0];
      const expiresAt = createCall[0].data.expiresAt;

      // Should be approximately 2 minutes from now
      const twoMinutesFromNow = new Date(Date.now() + 2 * 60 * 1000);
      expect(expiresAt.getTime()).toBeCloseTo(twoMinutesFromNow.getTime(), -3);
    });
  });

  describe('requestPANVerification', () => {
    const panDto = {
      identityId: 'test-identity-id',
      panNumber: 'ABCDE1234F',
      fullName: 'Test User',
      dateOfBirth: '1990-01-01',
    };

    it('should create a pending PAN verification request', async () => {
      const identity = createIdentityFixture({ id: panDto.identityId });
      const verificationRequest = createVerificationFixture({
        identityId: panDto.identityId,
        verificationType: 'PAN',
        status: 'PENDING',
      });

      prismaMock.identity.findUnique.mockResolvedValue(identity);
      prismaMock.verificationRequest.create.mockResolvedValue(verificationRequest);

      const result = await service.requestPANVerification(panDto);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('pending');
    });

    it('should throw NotFoundException for non-existent identity', async () => {
      prismaMock.identity.findUnique.mockResolvedValue(null);

      await expect(service.requestPANVerification(panDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should call API Setu with correct parameters', async () => {
      const identity = createIdentityFixture({ id: panDto.identityId });
      const verificationRequest = createVerificationFixture();

      prismaMock.identity.findUnique.mockResolvedValue(identity);
      prismaMock.verificationRequest.create.mockResolvedValue(verificationRequest);
      apiSetuService.verifyPAN.mockResolvedValue({
        valid: true,
        verificationHash: 'pan-hash',
        requestId: 'pan-req-id',
      });
      prismaMock.verificationRequest.update.mockResolvedValue(verificationRequest);
      prismaMock.identity.update.mockResolvedValue(identity);
      solanaService.updateVerificationStatus = jest.fn().mockResolvedValue('sig');

      await service.requestPANVerification(panDto);

      jest.advanceTimersByTime(1100);
      await Promise.resolve();

      expect(apiSetuService.verifyPAN).toHaveBeenCalledWith(
        panDto.panNumber,
        panDto.fullName,
        panDto.dateOfBirth
      );
    });

    it('should update bitmap with PAN bit on success', async () => {
      const identity = createIdentityFixture({
        id: panDto.identityId,
        verificationBitmap: 1, // Aadhaar already verified
      });
      const verificationRequest = createVerificationFixture();

      prismaMock.identity.findUnique.mockResolvedValue(identity);
      prismaMock.verificationRequest.create.mockResolvedValue(verificationRequest);
      apiSetuService.verifyPAN.mockResolvedValue({
        valid: true,
        verificationHash: 'hash',
        requestId: 'req',
      });
      prismaMock.verificationRequest.update.mockResolvedValue(verificationRequest);
      prismaMock.identity.update.mockResolvedValue(identity);
      solanaService.updateVerificationStatus = jest.fn().mockResolvedValue('sig');

      await service.requestPANVerification(panDto);

      jest.advanceTimersByTime(1100);
      await Promise.resolve();
      await Promise.resolve();

      expect(prismaMock.identity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            verificationBitmap: 3, // 1 (aadhaar) | 2 (pan) = 3
          }),
        })
      );
    });

    it('should handle verification failure', async () => {
      const identity = createIdentityFixture({ id: panDto.identityId });
      const verificationRequest = createVerificationFixture();

      prismaMock.identity.findUnique.mockResolvedValue(identity);
      prismaMock.verificationRequest.create.mockResolvedValue(verificationRequest);
      apiSetuService.verifyPAN.mockResolvedValue({
        valid: false,
        verificationHash: null,
        requestId: 'req',
      });
      prismaMock.verificationRequest.update.mockResolvedValue(verificationRequest);

      await service.requestPANVerification(panDto);

      jest.advanceTimersByTime(1100);
      await Promise.resolve();

      expect(prismaMock.verificationRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'failed',
          }),
        })
      );
    });

    it('should handle API Setu errors gracefully', async () => {
      const identity = createIdentityFixture({ id: panDto.identityId });
      const verificationRequest = createVerificationFixture();

      prismaMock.identity.findUnique.mockResolvedValue(identity);
      prismaMock.verificationRequest.create.mockResolvedValue(verificationRequest);
      apiSetuService.verifyPAN.mockRejectedValue(new Error('API error'));
      prismaMock.verificationRequest.update.mockResolvedValue(verificationRequest);

      await service.requestPANVerification(panDto);

      jest.advanceTimersByTime(1100);
      await Promise.resolve();
      await Promise.resolve();

      expect(prismaMock.verificationRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'failed' },
        })
      );
    });
  });

  describe('getVerificationStatus', () => {
    const verificationId = 'test-verification-id';

    it('should return verification status successfully', async () => {
      const verification = {
        ...mockVerification,
        id: verificationId,
        verificationType: 'aadhaar',
        status: 'completed',
        completedAt: new Date(),
        proofHash: 'hash123',
        identity: mockIdentity,
      };

      prismaMock.verificationRequest.findUnique.mockResolvedValue(verification);

      const result = await service.getVerificationStatus(verificationId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        verificationId,
        type: 'aadhaar',
        status: 'completed',
        completedAt: verification.completedAt,
        proofHash: 'hash123',
      });
    });

    it('should throw NotFoundException for non-existent verification', async () => {
      prismaMock.verificationRequest.findUnique.mockResolvedValue(null);

      await expect(service.getVerificationStatus('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return pending status for ongoing verification', async () => {
      const pendingVerification = {
        id: verificationId,
        verificationType: 'pan',
        status: 'pending',
        completedAt: null,
        proofHash: null,
        identity: mockIdentity,
        identityId: mockIdentity.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 60000),
      };

      prismaMock.verificationRequest.findUnique.mockResolvedValue(pendingVerification);

      const result = await service.getVerificationStatus(verificationId);

      expect(result.data.status).toBe('pending');
      expect(result.data.proofHash).toBeNull();
    });

    it('should return failed status for failed verification', async () => {
      const failedVerification = {
        id: verificationId,
        verificationType: 'aadhaar',
        status: 'failed',
        completedAt: new Date(),
        proofHash: null,
        identity: mockIdentity,
        identityId: mockIdentity.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(),
      };

      prismaMock.verificationRequest.findUnique.mockResolvedValue(failedVerification);

      const result = await service.getVerificationStatus(verificationId);

      expect(result.data.status).toBe('failed');
    });
  });

  describe('verification bitmap operations', () => {
    it('should correctly set Aadhaar bit (bit 0)', async () => {
      const identity = createIdentityFixture({ verificationBitmap: 0 });
      const verificationRequest = createVerificationFixture();

      prismaMock.identity.findUnique.mockResolvedValue(identity);
      prismaMock.verificationRequest.create.mockResolvedValue(verificationRequest);
      apiSetuService.verifyAadhaar.mockResolvedValue({
        verified: true,
        verificationHash: 'hash',
        requestId: 'req',
      });
      prismaMock.verificationRequest.update.mockResolvedValue(verificationRequest);
      prismaMock.identity.update.mockResolvedValue(identity);
      solanaService.updateVerificationStatus = jest.fn().mockResolvedValue('sig');

      await service.requestAadhaarVerification({
        identityId: identity.id,
        aadhaarNumber: '123456789012',
        consent: true,
      });

      jest.advanceTimersByTime(1100);
      await Promise.resolve();
      await Promise.resolve();

      expect(prismaMock.identity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            verificationBitmap: 1, // bit 0 set
          }),
        })
      );
    });

    it('should correctly set PAN bit (bit 1)', async () => {
      const identity = createIdentityFixture({ verificationBitmap: 0 });
      const verificationRequest = createVerificationFixture();

      prismaMock.identity.findUnique.mockResolvedValue(identity);
      prismaMock.verificationRequest.create.mockResolvedValue(verificationRequest);
      apiSetuService.verifyPAN.mockResolvedValue({
        valid: true,
        verificationHash: 'hash',
        requestId: 'req',
      });
      prismaMock.verificationRequest.update.mockResolvedValue(verificationRequest);
      prismaMock.identity.update.mockResolvedValue(identity);
      solanaService.updateVerificationStatus = jest.fn().mockResolvedValue('sig');

      await service.requestPANVerification({
        identityId: identity.id,
        panNumber: 'ABCDE1234F',
        fullName: 'Test',
        dateOfBirth: '1990-01-01',
      });

      jest.advanceTimersByTime(1100);
      await Promise.resolve();
      await Promise.resolve();

      expect(prismaMock.identity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            verificationBitmap: 2, // bit 1 set
          }),
        })
      );
    });
  });
});
