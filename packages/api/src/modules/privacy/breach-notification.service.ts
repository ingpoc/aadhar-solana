import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../services/database.service';
import { AuditService, AuditSeverity } from '../../services/audit.service';

export enum BreachSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum BreachStatus {
  DETECTED = 'detected',
  INVESTIGATING = 'investigating',
  CONTAINED = 'contained',
  NOTIFIED_DPDPA = 'notified_dpdpa',
  NOTIFIED_USERS = 'notified_users',
  RESOLVED = 'resolved',
}

export interface DataBreach {
  id: string;
  title: string;
  description: string;
  severity: BreachSeverity;
  status: BreachStatus;
  detectedAt: Date;
  containedAt?: Date;
  resolvedAt?: Date;
  affectedUsers: number;
  affectedDataTypes: string[];
  rootCause?: string;
  remediation?: string;
  dpdpaNotifiedAt?: Date;
  usersNotifiedAt?: Date;
}

/**
 * Data Breach Notification Service
 *
 * Implements DPDP Act 2023 breach notification requirements (Section 8):
 * - Report to Data Protection Board within 72 hours
 * - Notify affected data principals
 * - Maintain breach register
 */
@Injectable()
export class BreachNotificationService {
  private readonly logger = new Logger(BreachNotificationService.name);
  private readonly notificationDeadlineHours = 72;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Report a data breach
   */
  async reportBreach(breach: {
    title: string;
    description: string;
    severity: BreachSeverity;
    affectedDataTypes: string[];
    estimatedAffectedUsers?: number;
  }): Promise<DataBreach> {
    const breachRecord = await this.databaseService.dataBreach.create({
      data: {
        title: breach.title,
        description: breach.description,
        severity: breach.severity,
        status: BreachStatus.DETECTED,
        detectedAt: new Date(),
        affectedUsers: breach.estimatedAffectedUsers || 0,
        affectedDataTypes: breach.affectedDataTypes,
      },
    });

    await this.auditService.log({
      action: 'security.breach_detected',
      resource: 'data_breach',
      resourceId: breachRecord.id,
      metadata: {
        severity: breach.severity,
        affectedDataTypes: breach.affectedDataTypes,
      },
      severity: AuditSeverity.CRITICAL,
    });

    if (this.requiresDPDPANotification(breach.severity)) {
      this.logger.error(
        `CRITICAL: Data breach detected. DPDPA notification required within 72 hours. Breach ID: ${breachRecord.id}`,
      );
    }

    return breachRecord as DataBreach;
  }

  /**
   * Update breach status
   */
  async updateBreachStatus(
    breachId: string,
    status: BreachStatus,
    details?: { rootCause?: string; remediation?: string },
  ): Promise<DataBreach> {
    const updateData: any = { status };

    if (status === BreachStatus.CONTAINED) {
      updateData.containedAt = new Date();
    } else if (status === BreachStatus.RESOLVED) {
      updateData.resolvedAt = new Date();
    } else if (status === BreachStatus.NOTIFIED_DPDPA) {
      updateData.dpdpaNotifiedAt = new Date();
    } else if (status === BreachStatus.NOTIFIED_USERS) {
      updateData.usersNotifiedAt = new Date();
    }

    if (details?.rootCause) {
      updateData.rootCause = details.rootCause;
    }
    if (details?.remediation) {
      updateData.remediation = details.remediation;
    }

    const breach = await this.databaseService.dataBreach.update({
      where: { id: breachId },
      data: updateData,
    });

    await this.auditService.log({
      action: `security.breach_${status}`,
      resource: 'data_breach',
      resourceId: breachId,
      metadata: { status, details },
      severity: AuditSeverity.CRITICAL,
    });

    return breach as DataBreach;
  }

  /**
   * Get all breaches
   */
  async getAllBreaches(): Promise<DataBreach[]> {
    const breaches = await this.databaseService.dataBreach.findMany({
      orderBy: { detectedAt: 'desc' },
    });
    return breaches as DataBreach[];
  }

  /**
   * Get breach by ID
   */
  async getBreachById(breachId: string): Promise<DataBreach | null> {
    const breach = await this.databaseService.dataBreach.findUnique({
      where: { id: breachId },
    });
    return breach as DataBreach | null;
  }

  /**
   * Get breaches pending DPDPA notification
   */
  async getBreachesPendingNotification(): Promise<DataBreach[]> {
    const deadline = new Date(Date.now() - this.notificationDeadlineHours * 60 * 60 * 1000);

    const breaches = await this.databaseService.dataBreach.findMany({
      where: {
        severity: { in: [BreachSeverity.HIGH, BreachSeverity.CRITICAL] },
        dpdpaNotifiedAt: null,
        detectedAt: { lt: deadline },
      },
    });

    return breaches as DataBreach[];
  }

  /**
   * Generate DPDPA notification document
   */
  async generateDPDPANotification(breachId: string): Promise<string> {
    const breach = await this.databaseService.dataBreach.findUnique({
      where: { id: breachId },
    });

    if (!breach) throw new Error('Breach not found');

    return `
DATA BREACH NOTIFICATION
As per Section 8 of Digital Personal Data Protection Act, 2023

1. ORGANIZATION DETAILS
   Name: AadhaarChain Platform
   Registration: [Registration Number]

2. BREACH DETAILS
   Breach ID: ${breach.id}
   Date Detected: ${breach.detectedAt.toISOString()}
   Description: ${breach.description}
   Severity: ${breach.severity}

3. DATA AFFECTED
   Types: ${(breach.affectedDataTypes as string[]).join(', ')}
   Estimated Affected Individuals: ${breach.affectedUsers}

4. ROOT CAUSE
   ${breach.rootCause || 'Under investigation'}

5. REMEDIATION MEASURES
   ${breach.remediation || 'In progress'}

6. CONTAINMENT STATUS
   Status: ${breach.status}
   ${breach.containedAt ? `Contained At: ${breach.containedAt.toISOString()}` : 'Containment in progress'}

7. CONTACT
   Data Protection Officer: [DPO Name]
   Email: dpo@aadhaarchain.io

Date: ${new Date().toISOString()}
    `.trim();
  }

  /**
   * Check if breach requires DPDPA notification
   */
  private requiresDPDPANotification(severity: BreachSeverity): boolean {
    return severity === BreachSeverity.HIGH || severity === BreachSeverity.CRITICAL;
  }

  /**
   * Calculate time remaining for notification deadline
   */
  async getNotificationDeadline(breachId: string): Promise<{
    deadline: Date;
    hoursRemaining: number;
    isOverdue: boolean;
  }> {
    const breach = await this.databaseService.dataBreach.findUnique({
      where: { id: breachId },
    });

    if (!breach) throw new Error('Breach not found');

    const deadline = new Date(breach.detectedAt.getTime() + this.notificationDeadlineHours * 60 * 60 * 1000);
    const hoursRemaining = Math.max(0, (deadline.getTime() - Date.now()) / (60 * 60 * 1000));
    const isOverdue = Date.now() > deadline.getTime() && !breach.dpdpaNotifiedAt;

    return { deadline, hoursRemaining: Math.round(hoursRemaining), isOverdue };
  }
}
