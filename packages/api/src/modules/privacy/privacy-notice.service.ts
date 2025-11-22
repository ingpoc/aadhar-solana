import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';
import { AuditService } from '../../services/audit.service';

export interface PrivacyNoticeContent {
  title: string;
  lastUpdated: string;
  sections: {
    dataCollected: string;
    purposeOfProcessing: string;
    dataRetention: string;
    dataSharing: string;
    yourRights: string;
    security: string;
    contact: string;
    grievanceOfficer: {
      name: string;
      email: string;
      address: string;
    };
  };
}

export interface PrivacyNotice {
  id: string;
  version: string;
  effectiveDate: Date;
  content: PrivacyNoticeContent;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Privacy Notice Service
 *
 * Implements DPDP Act 2023 privacy notice requirements (Section 5)
 */
@Injectable()
export class PrivacyNoticeService {
  private readonly logger = new Logger(PrivacyNoticeService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get current active privacy notice
   */
  async getCurrentNotice(): Promise<PrivacyNotice | null> {
    const notice = await this.databaseService.privacyNotice.findFirst({
      where: { isActive: true },
      orderBy: { effectiveDate: 'desc' },
    });
    return notice as PrivacyNotice | null;
  }

  /**
   * Get privacy notice by version
   */
  async getNoticeByVersion(version: string): Promise<PrivacyNotice | null> {
    const notice = await this.databaseService.privacyNotice.findFirst({
      where: { version },
    });
    return notice as PrivacyNotice | null;
  }

  /**
   * Check if user has acknowledged current privacy notice
   */
  async hasUserAcknowledged(userId: string): Promise<boolean> {
    const currentNotice = await this.getCurrentNotice();
    if (!currentNotice) return true;

    const acknowledgment = await this.databaseService.privacyAcknowledgment.findFirst({
      where: {
        userId,
        privacyNoticeId: currentNotice.id,
      },
    });

    return acknowledgment !== null;
  }

  /**
   * Record user acknowledgment of privacy notice
   */
  async recordAcknowledgment(
    userId: string,
    request?: { ip?: string; userAgent?: string },
  ): Promise<void> {
    const currentNotice = await this.getCurrentNotice();
    if (!currentNotice) return;

    const existing = await this.databaseService.privacyAcknowledgment.findFirst({
      where: {
        userId,
        privacyNoticeId: currentNotice.id,
      },
    });

    if (existing) return;

    await this.databaseService.privacyAcknowledgment.create({
      data: {
        userId,
        privacyNoticeId: currentNotice.id,
        acknowledgedAt: new Date(),
        ipAddress: request?.ip,
        userAgent: request?.userAgent,
      },
    });

    await this.auditService.log({
      action: 'privacy.notice_acknowledged',
      userId,
      resource: 'privacy_notice',
      resourceId: currentNotice.id,
      ipAddress: request?.ip,
      userAgent: request?.userAgent,
      metadata: { version: currentNotice.version },
    });
  }

  /**
   * Create new privacy notice version
   */
  async createNoticeVersion(
    content: PrivacyNoticeContent,
    effectiveDate: Date,
  ): Promise<PrivacyNotice> {
    // Deactivate current notice
    await this.databaseService.privacyNotice.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    const version = await this.generateVersion();
    const notice = await this.databaseService.privacyNotice.create({
      data: {
        version,
        effectiveDate,
        content: content as any,
        isActive: true,
      },
    });

    await this.auditService.log({
      action: 'privacy.notice_created',
      resource: 'privacy_notice',
      resourceId: notice.id,
      metadata: { version, effectiveDate: effectiveDate.toISOString() },
    });

    return notice as PrivacyNotice;
  }

  /**
   * Get all privacy notice versions
   */
  async getAllVersions(): Promise<PrivacyNotice[]> {
    const notices = await this.databaseService.privacyNotice.findMany({
      orderBy: { effectiveDate: 'desc' },
    });
    return notices as PrivacyNotice[];
  }

  /**
   * Get users who need to acknowledge new privacy notice
   */
  async getUsersPendingAcknowledgment(): Promise<string[]> {
    const currentNotice = await this.getCurrentNotice();
    if (!currentNotice) return [];

    const acknowledgedUsers = await this.databaseService.privacyAcknowledgment.findMany({
      where: { privacyNoticeId: currentNotice.id },
      select: { userId: true },
    });

    const acknowledgedUserIds = new Set(acknowledgedUsers.map((a) => a.userId));

    const allUsers = await this.databaseService.user.findMany({
      where: { status: 'active' },
      select: { id: true },
    });

    return allUsers.filter((u) => !acknowledgedUserIds.has(u.id)).map((u) => u.id);
  }

  private async generateVersion(): Promise<string> {
    const count = await this.databaseService.privacyNotice.count();
    return `${count + 1}.0`;
  }

  /**
   * Get default privacy notice content
   */
  getDefaultContent(): PrivacyNoticeContent {
    return {
      title: 'AadhaarChain Privacy Notice',
      lastUpdated: new Date().toISOString().split('T')[0],
      sections: {
        dataCollected: `We collect the following personal data:
- Identity information (name, date of birth)
- Government IDs (Aadhaar, PAN) - encrypted at rest
- Contact information (email, phone)
- Biometric data for authentication
- Blockchain wallet addresses
- Usage and activity logs`,
        purposeOfProcessing: `Your data is processed for:
- Creating and managing your decentralized identity
- Verifying your identity via government APIs
- Issuing verifiable credentials
- Platform security and fraud prevention
- Regulatory compliance`,
        dataRetention: `Data retention periods:
- Identity data: Until account deletion
- Verification records: 5 years (regulatory requirement)
- Audit logs: 5 years
- Consent records: 5 years after consent expiry`,
        dataSharing: `We may share data with:
- Government APIs for identity verification
- Third-party verifiers (with your consent)
- Law enforcement (when legally required)
We never sell your personal data.`,
        yourRights: `Under DPDP Act 2023, you have the right to:
- Access your personal data
- Correct inaccurate data
- Request erasure of your data
- Data portability
- Withdraw consent at any time
- File a grievance`,
        security: `We protect your data using:
- AES-256-GCM encryption for all PII
- Blockchain-based verification
- Multi-factor authentication
- Regular security audits`,
        contact: `For privacy inquiries, contact:
Email: privacy@aadhaarchain.io
Address: [Company Address]`,
        grievanceOfficer: {
          name: 'Data Protection Officer',
          email: 'dpo@aadhaarchain.io',
          address: '[DPO Address]',
        },
      },
    };
  }
}
