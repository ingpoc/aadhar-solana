import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';
import { ApiSetuService } from '../../services/api-setu.service';
import { SolanaService } from '../../services/solana.service';
import { AadhaarVerificationDto, PANVerificationDto } from './verification.dto';

@Injectable()
export class VerificationService {
  constructor(
    private readonly db: DatabaseService,
    private readonly apiSetu: ApiSetuService,
    private readonly solana: SolanaService,
  ) {}

  async requestAadhaarVerification(dto: AadhaarVerificationDto) {
    const identity = await this.db.identity.findUnique({
      where: { id: dto.identityId },
    });

    if (!identity) {
      throw new NotFoundException('Identity not found');
    }

    const verificationRequest = await this.db.verificationRequest.create({
      data: {
        identityId: dto.identityId,
        verificationType: 'aadhaar',
        status: 'pending',
        expiresAt: new Date(Date.now() + 2 * 60 * 1000),
      },
    });

    setTimeout(async () => {
      try {
        const result = await this.apiSetu.verifyAadhaar(dto.aadhaarNumber, dto.consent);

        await this.db.verificationRequest.update({
          where: { id: verificationRequest.id },
          data: {
            status: result.verified ? 'completed' : 'failed',
            proofHash: result.verificationHash,
            apiSetuRequestId: result.requestId,
            completedAt: new Date(),
          },
        });

        if (result.verified) {
          await this.solana.updateVerificationStatus(
            identity.solanaPublicKey,
            0,
            true,
          );

          await this.db.identity.update({
            where: { id: dto.identityId },
            data: {
              verificationBitmap: Number(identity.verificationBitmap) | (1 << 0),
            },
          });
        }
      } catch (error) {
        await this.db.verificationRequest.update({
          where: { id: verificationRequest.id },
          data: { status: 'failed' },
        });
      }
    }, 1000);

    return {
      success: true,
      data: {
        verificationId: verificationRequest.id,
        status: 'pending',
        estimatedCompletionTime: verificationRequest.expiresAt,
      },
    };
  }

  async requestPANVerification(dto: PANVerificationDto) {
    const identity = await this.db.identity.findUnique({
      where: { id: dto.identityId },
    });

    if (!identity) {
      throw new NotFoundException('Identity not found');
    }

    const verificationRequest = await this.db.verificationRequest.create({
      data: {
        identityId: dto.identityId,
        verificationType: 'pan',
        status: 'pending',
        expiresAt: new Date(Date.now() + 2 * 60 * 1000),
      },
    });

    setTimeout(async () => {
      try {
        const result = await this.apiSetu.verifyPAN(
          dto.panNumber,
          dto.fullName,
          dto.dateOfBirth,
        );

        await this.db.verificationRequest.update({
          where: { id: verificationRequest.id },
          data: {
            status: result.valid ? 'completed' : 'failed',
            proofHash: result.verificationHash,
            apiSetuRequestId: result.requestId,
            completedAt: new Date(),
          },
        });

        if (result.valid) {
          await this.solana.updateVerificationStatus(
            identity.solanaPublicKey,
            1,
            true,
          );

          await this.db.identity.update({
            where: { id: dto.identityId },
            data: {
              verificationBitmap: Number(identity.verificationBitmap) | (1 << 1),
            },
          });
        }
      } catch (error) {
        await this.db.verificationRequest.update({
          where: { id: verificationRequest.id },
          data: { status: 'failed' },
        });
      }
    }, 1000);

    return {
      success: true,
      data: {
        verificationId: verificationRequest.id,
        status: 'pending',
        estimatedCompletionTime: verificationRequest.expiresAt,
      },
    };
  }

  async getVerificationStatus(id: string) {
    const verification = await this.db.verificationRequest.findUnique({
      where: { id },
      include: { identity: true },
    });

    if (!verification) {
      throw new NotFoundException('Verification request not found');
    }

    return {
      success: true,
      data: {
        verificationId: verification.id,
        type: verification.verificationType,
        status: verification.status,
        completedAt: verification.completedAt,
        proofHash: verification.proofHash,
      },
    };
  }
}
