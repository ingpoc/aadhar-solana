/**
 * Data Rights Interfaces
 *
 * Implements DPDP Act 2023 data subject rights:
 * - Right to Access (Section 11)
 * - Right to Correction (Section 12)
 * - Right to Erasure (Section 12)
 * - Right to Data Portability
 */

export enum RequestType {
  ACCESS = 'ACCESS',
  ERASURE = 'ERASURE',
  CORRECTION = 'CORRECTION',
  PORTABILITY = 'PORTABILITY',
  GRIEVANCE = 'GRIEVANCE',
}

export enum RequestStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export interface DataRightsRequest {
  id: string;
  userId: string;
  requestType: RequestType;
  status: RequestStatus;
  categories: string[];
  reason?: string;
  submittedAt: Date;
  responseDeadline: Date;
  completedAt?: Date;
  responseData?: string;
  metadata?: Record<string, any>;
}

export interface DataAccessRequest extends DataRightsRequest {
  requestType: RequestType.ACCESS;
}

export interface ErasureRequest extends DataRightsRequest {
  requestType: RequestType.ERASURE;
}

export interface CorrectionRequest extends DataRightsRequest {
  requestType: RequestType.CORRECTION;
}

export interface PortabilityRequest extends DataRightsRequest {
  requestType: RequestType.PORTABILITY;
}

export interface DataExportResult {
  data: Record<string, any>;
  format: 'json' | 'csv' | 'xml';
  filename: string;
  generatedAt: Date;
}

export interface ErasureResult {
  deletedCategories: string[];
  retainedCategories: { category: string; reason: string }[];
}

export interface GrievanceSubmission {
  category: 'consent' | 'access' | 'erasure' | 'correction' | 'other';
  description: string;
  relatedRequestId?: string;
}

/**
 * Data categories available for access/export
 */
export const DATA_CATEGORIES = [
  'profile',
  'identity',
  'verifications',
  'credentials',
  'reputation',
  'consents',
  'staking',
  'activity',
  'pii',
] as const;

export type DataCategory = (typeof DATA_CATEGORIES)[number];
