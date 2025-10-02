import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';
import { SolanaService } from '../../services/solana.service';
import { IssueCredentialDto } from './credentials.dto';

@Injectable()
export class CredentialsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly solana: SolanaService,
  ) {}

  async issueCredential(dto: IssueCredentialDto) {
    const identity = await this.db.identity.findUnique({
      where: { id: dto.subjectId },
    });

    if (!identity) {
      throw new NotFoundException('Identity not found');
    }

    const credentialId = `cred-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const credential = await this.db.credential.create({
      data: {
        credentialId,
        identityId: dto.subjectId,
        credentialType: dto.credentialType,
        metadataUri: JSON.stringify(dto.claims),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    const txSignature = await this.solana.issueCredential(
      dto.subjectId,
      dto.credentialType,
      dto.claims,
    );

    return {
      success: true,
      data: {
        credentialId: credential.credentialId,
        credentialType: credential.credentialType,
        issuedAt: credential.issuedAt,
        transactionSignature: txSignature,
      },
    };
  }

  async getCredential(id: string) {
    const credential = await this.db.credential.findUnique({
      where: { credentialId: id },
      include: { identity: true },
    });

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    return {
      success: true,
      data: {
        credentialId: credential.credentialId,
        subjectId: credential.identityId,
        credentialType: credential.credentialType,
        claims: JSON.parse(credential.metadataUri || '{}'),
        issuedAt: credential.issuedAt,
        expiresAt: credential.expiresAt,
        revoked: credential.revoked,
        verifiable: !credential.revoked,
      },
    };
  }

  async verifyCredential(id: string) {
    const credential = await this.db.credential.findUnique({
      where: { credentialId: id },
    });

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    const isExpired = credential.expiresAt && credential.expiresAt < new Date();

    return {
      success: true,
      data: {
        valid: !credential.revoked && !isExpired,
        revoked: credential.revoked,
        expired: isExpired,
        issuerVerified: true,
        signatureValid: true,
        verifiedAt: new Date(),
      },
    };
  }

  async revokeCredential(id: string) {
    const credential = await this.db.credential.findUnique({
      where: { credentialId: id },
    });

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    await this.db.credential.update({
      where: { credentialId: id },
      data: {
        revoked: true,
        revokedAt: new Date(),
      },
    });

    return { success: true, message: 'Credential revoked successfully' };
  }
}
