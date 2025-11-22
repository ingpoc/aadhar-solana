import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../services/database.service';
import { AuditService } from '../../services/audit.service';
import { ConsentService } from '../consent/consent.service';
import {
  RequestType,
  RequestStatus,
  DataRightsRequest,
  DataExportResult,
  ErasureResult,
} from './interfaces/data-rights.interfaces';

/**
 * Data Subject Rights Service
 *
 * Implements DPDP Act 2023 data subject rights:
 * - Right to Access (Section 11)
 * - Right to Correction (Section 12)
 * - Right to Erasure (Section 12)
 * - Right to Data Portability
 */
@Injectable()
export class DataRightsService {
  private readonly logger = new Logger(DataRightsService.name);
  private readonly responseDeadline: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
    private readonly consentService: ConsentService,
  ) {
    this.responseDeadline = this.configService.get<number>('DATA_RIGHTS_RESPONSE_DAYS', 30);
  }

  // ===========================
  // Right to Access
  // ===========================

  async submitAccessRequest(
    userId: string,
    request: { categories?: string[]; reason?: string },
  ): Promise<DataRightsRequest> {
    const requestId = this.generateRequestId('ACCESS');
    const deadline = this.calculateDeadline(this.responseDeadline);

    const accessRequest = await this.databaseService.dataRightsRequest.create({
      data: {
        id: requestId,
        userId,
        requestType: RequestType.ACCESS,
        status: RequestStatus.PENDING,
        categories: request.categories || ['all'],
        reason: request.reason,
        submittedAt: new Date(),
        responseDeadline: deadline,
      },
    });

    await this.auditService.log({
      action: 'data_rights.access_request',
      userId,
      resource: 'data_rights_request',
      resourceId: requestId,
      metadata: { categories: request.categories },
    });

    return accessRequest as DataRightsRequest;
  }

  async processAccessRequest(requestId: string): Promise<DataExportResult> {
    const request = await this.databaseService.dataRightsRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    const userData = await this.collectUserData(request.userId, request.categories as string[]);

    await this.databaseService.dataRightsRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.COMPLETED,
        completedAt: new Date(),
        responseData: JSON.stringify(userData),
      },
    });

    return {
      data: userData,
      format: 'json',
      filename: `data_export_${request.userId}_${Date.now()}.json`,
      generatedAt: new Date(),
    };
  }

  // ===========================
  // Right to Erasure
  // ===========================

  async submitErasureRequest(
    userId: string,
    request: { scope: 'full' | 'partial'; categories?: string[]; reason: string },
  ): Promise<DataRightsRequest> {
    const requestId = this.generateRequestId('ERASURE');
    const deadline = this.calculateDeadline(this.responseDeadline);

    const erasureRequest = await this.databaseService.dataRightsRequest.create({
      data: {
        id: requestId,
        userId,
        requestType: RequestType.ERASURE,
        status: RequestStatus.PENDING,
        categories: request.scope === 'full' ? ['all'] : request.categories,
        reason: request.reason,
        submittedAt: new Date(),
        responseDeadline: deadline,
        metadata: { scope: request.scope },
      },
    });

    await this.auditService.log({
      action: 'data_rights.erasure_request',
      userId,
      resource: 'data_rights_request',
      resourceId: requestId,
      metadata: { scope: request.scope, categories: request.categories },
    });

    return erasureRequest as DataRightsRequest;
  }

  async processErasureRequest(requestId: string): Promise<ErasureResult> {
    const request = await this.databaseService.dataRightsRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    const categories = request.categories as string[];
    const includeAll = categories.includes('all');
    const deletedCategories: string[] = [];
    const retainedCategories: { category: string; reason: string }[] = [];

    // Delete encrypted PII
    if (includeAll || categories.includes('pii')) {
      const identityIds = await this.getUserIdentityIds(request.userId);
      if (identityIds.length > 0) {
        await this.databaseService.encryptedPII.deleteMany({
          where: { identityId: { in: identityIds } },
        });
        deletedCategories.push('pii');
      }
    }

    // Delete credentials
    if (includeAll || categories.includes('credentials')) {
      await this.databaseService.credential.deleteMany({
        where: { identity: { userId: request.userId } },
      });
      deletedCategories.push('credentials');
    }

    // Revoke all consents
    if (includeAll || categories.includes('consents')) {
      await this.databaseService.consent.updateMany({
        where: { userId: request.userId, status: 'active' },
        data: { status: 'revoked', revokedAt: new Date(), revocationReason: 'Erasure request' },
      });
      deletedCategories.push('consents');
    }

    // Anonymize profile (if full erasure)
    if (includeAll || categories.includes('profile')) {
      await this.databaseService.user.update({
        where: { id: request.userId },
        data: {
          email: null,
          phone: null,
          status: 'deleted',
        },
      });
      deletedCategories.push('profile');
    }

    // Retain audit logs (regulatory requirement)
    if (includeAll || categories.includes('activity')) {
      retainedCategories.push({
        category: 'activity',
        reason: 'Audit logs retained for 5 years as per regulatory requirements',
      });
    }

    // Retain verification records
    if (includeAll || categories.includes('verifications')) {
      retainedCategories.push({
        category: 'verifications',
        reason: 'Verification records retained for 5 years as per Aadhaar Act',
      });
    }

    await this.databaseService.dataRightsRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.COMPLETED,
        completedAt: new Date(),
        responseData: JSON.stringify({ deletedCategories, retainedCategories }),
      },
    });

    return { deletedCategories, retainedCategories };
  }

  // ===========================
  // Right to Correction
  // ===========================

  async submitCorrectionRequest(
    userId: string,
    request: {
      field: string;
      currentValue: string;
      correctedValue: string;
      reason: string;
      evidence?: string;
    },
  ): Promise<DataRightsRequest> {
    const requestId = this.generateRequestId('CORRECTION');
    const deadline = this.calculateDeadline(this.responseDeadline);

    const correctionRequest = await this.databaseService.dataRightsRequest.create({
      data: {
        id: requestId,
        userId,
        requestType: RequestType.CORRECTION,
        status: RequestStatus.PENDING,
        reason: request.reason,
        submittedAt: new Date(),
        responseDeadline: deadline,
        metadata: {
          field: request.field,
          currentValue: request.currentValue,
          correctedValue: request.correctedValue,
          evidence: request.evidence,
        },
      },
    });

    await this.auditService.log({
      action: 'data_rights.correction_request',
      userId,
      resource: 'data_rights_request',
      resourceId: requestId,
      metadata: { field: request.field },
    });

    return correctionRequest as DataRightsRequest;
  }

  // ===========================
  // Right to Data Portability
  // ===========================

  async submitPortabilityRequest(
    userId: string,
    request: { format: 'json' | 'csv' | 'xml'; categories?: string[] },
  ): Promise<DataRightsRequest> {
    const requestId = this.generateRequestId('PORTABILITY');
    const deadline = this.calculateDeadline(this.responseDeadline);

    const portabilityRequest = await this.databaseService.dataRightsRequest.create({
      data: {
        id: requestId,
        userId,
        requestType: RequestType.PORTABILITY,
        status: RequestStatus.PENDING,
        categories: request.categories || ['all'],
        submittedAt: new Date(),
        responseDeadline: deadline,
        metadata: { format: request.format },
      },
    });

    return portabilityRequest as DataRightsRequest;
  }

  async generatePortableExport(requestId: string): Promise<{
    data: string;
    format: string;
    filename: string;
  }> {
    const request = await this.databaseService.dataRightsRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    const userData = await this.collectUserData(request.userId, request.categories as string[]);
    const metadata = request.metadata as any;
    const format = metadata?.format || 'json';

    let exportData: string;
    let filename: string;

    switch (format) {
      case 'csv':
        exportData = this.convertToCSV(userData);
        filename = `data_export_${request.userId}_${Date.now()}.csv`;
        break;
      case 'xml':
        exportData = this.convertToXML(userData);
        filename = `data_export_${request.userId}_${Date.now()}.xml`;
        break;
      default:
        exportData = JSON.stringify(userData, null, 2);
        filename = `data_export_${request.userId}_${Date.now()}.json`;
    }

    await this.databaseService.dataRightsRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    return { data: exportData, format, filename };
  }

  // ===========================
  // Grievance Redressal
  // ===========================

  async submitGrievance(
    userId: string,
    grievance: {
      category: 'consent' | 'access' | 'erasure' | 'correction' | 'other';
      description: string;
      relatedRequestId?: string;
    },
  ): Promise<{ grievanceId: string; status: string; responseDeadline: Date }> {
    const grievanceId = this.generateRequestId('GRIEVANCE');
    const deadline = this.calculateDeadline(15); // 15 days for grievance

    await this.databaseService.dataRightsRequest.create({
      data: {
        id: grievanceId,
        userId,
        requestType: 'GRIEVANCE' as RequestType,
        status: RequestStatus.PENDING,
        reason: grievance.description,
        submittedAt: new Date(),
        responseDeadline: deadline,
        metadata: {
          category: grievance.category,
          relatedRequestId: grievance.relatedRequestId,
        },
      },
    });

    await this.auditService.log({
      action: 'data_rights.grievance',
      userId,
      resource: 'data_rights_request',
      resourceId: grievanceId,
      metadata: { category: grievance.category },
    });

    return {
      grievanceId,
      status: 'pending',
      responseDeadline: deadline,
    };
  }

  // ===========================
  // Query Methods
  // ===========================

  async getUserRequests(userId: string): Promise<DataRightsRequest[]> {
    const requests = await this.databaseService.dataRightsRequest.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
    });
    return requests as DataRightsRequest[];
  }

  async getRequestById(requestId: string): Promise<DataRightsRequest | null> {
    const request = await this.databaseService.dataRightsRequest.findUnique({
      where: { id: requestId },
    });
    return request as DataRightsRequest | null;
  }

  // ===========================
  // Helper Methods
  // ===========================

  private generateRequestId(type: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${type}-${timestamp}-${random}`;
  }

  private calculateDeadline(days: number): Date {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private async getUserIdentityIds(userId: string): Promise<string[]> {
    const identities = await this.databaseService.identity.findMany({
      where: { userId },
      select: { id: true },
    });
    return identities.map((i) => i.id);
  }

  private async collectUserData(
    userId: string,
    categories: string[],
  ): Promise<Record<string, any>> {
    const includeAll = categories.includes('all');
    const data: Record<string, any> = {};

    if (includeAll || categories.includes('profile')) {
      data.profile = await this.databaseService.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, phone: true, status: true, createdAt: true },
      });
    }

    if (includeAll || categories.includes('identity')) {
      data.identities = await this.databaseService.identity.findMany({
        where: { userId },
        select: { id: true, did: true, solanaPublicKey: true, verificationBitmap: true, createdAt: true },
      });
    }

    if (includeAll || categories.includes('verifications')) {
      data.verifications = await this.databaseService.verificationRequest.findMany({
        where: { identity: { userId } },
        select: { id: true, verificationType: true, status: true, createdAt: true },
      });
    }

    if (includeAll || categories.includes('credentials')) {
      data.credentials = await this.databaseService.credential.findMany({
        where: { identity: { userId } },
        select: { id: true, credentialId: true, credentialType: true, issuedAt: true, revoked: true },
      });
    }

    if (includeAll || categories.includes('consents')) {
      data.consents = await this.consentService.getUserConsents(userId, {
        includeRevoked: true,
        includeExpired: true,
      });
    }

    if (includeAll || categories.includes('activity')) {
      data.activityLog = await this.databaseService.auditLog.findMany({
        where: { userId, createdAt: { gt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
        select: { action: true, resource: true, ipAddress: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });
    }

    return data;
  }

  private convertToCSV(data: Record<string, any>): string {
    const lines: string[] = [];
    for (const [category, items] of Object.entries(data)) {
      if (Array.isArray(items) && items.length > 0) {
        const headers = Object.keys(items[0]);
        lines.push(`# ${category}`);
        lines.push(headers.join(','));
        for (const item of items) {
          lines.push(headers.map((h) => JSON.stringify(item[h] ?? '')).join(','));
        }
        lines.push('');
      }
    }
    return lines.join('\n');
  }

  private convertToXML(data: Record<string, any>): string {
    const toXML = (obj: any, tag: string): string => {
      if (Array.isArray(obj)) {
        return obj.map((item, i) => toXML(item, `item`)).join('');
      }
      if (typeof obj === 'object' && obj !== null) {
        const children = Object.entries(obj)
          .map(([k, v]) => toXML(v, k))
          .join('');
        return `<${tag}>${children}</${tag}>`;
      }
      return `<${tag}>${obj ?? ''}</${tag}>`;
    };

    return `<?xml version="1.0" encoding="UTF-8"?>\n<data_export>\n${toXML(data, 'data')}\n</data_export>`;
  }
}
