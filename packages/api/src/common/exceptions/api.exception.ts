import { HttpException, HttpStatus } from '@nestjs/common';

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    requestId?: string;
    timestamp: string;
  };
}

export class ApiException extends HttpException {
  public readonly code: string;
  public readonly details?: any;

  constructor(
    code: string,
    message: string,
    status: HttpStatus,
    details?: any,
  ) {
    super(
      {
        success: false,
        error: {
          code,
          message,
          details,
          timestamp: new Date().toISOString(),
        },
      } as ApiErrorResponse,
      status,
    );
    this.code = code;
    this.details = details;
  }
}

// Identity Errors
export class IdentityNotFoundException extends ApiException {
  constructor(identifier?: string) {
    super(
      'IDENTITY_NOT_FOUND',
      identifier ? `Identity not found: ${identifier}` : 'Identity not found',
      HttpStatus.NOT_FOUND,
    );
  }
}

export class IdentityAlreadyExistsException extends ApiException {
  constructor(identifier?: string) {
    super(
      'IDENTITY_ALREADY_EXISTS',
      identifier ? `Identity already exists: ${identifier}` : 'Identity already exists',
      HttpStatus.CONFLICT,
    );
  }
}

export class InvalidDIDException extends ApiException {
  constructor(did?: string) {
    super(
      'INVALID_DID',
      did ? `Invalid DID format: ${did}` : 'Invalid DID format',
      HttpStatus.BAD_REQUEST,
    );
  }
}

// Verification Errors
export class VerificationNotFoundException extends ApiException {
  constructor(id?: string) {
    super(
      'VERIFICATION_NOT_FOUND',
      id ? `Verification request not found: ${id}` : 'Verification request not found',
      HttpStatus.NOT_FOUND,
    );
  }
}

export class VerificationAlreadyCompletedException extends ApiException {
  constructor() {
    super(
      'VERIFICATION_ALREADY_COMPLETED',
      'Verification has already been completed',
      HttpStatus.CONFLICT,
    );
  }
}

export class VerificationExpiredException extends ApiException {
  constructor() {
    super(
      'VERIFICATION_EXPIRED',
      'Verification request has expired',
      HttpStatus.GONE,
    );
  }
}

export class InvalidVerificationTypeException extends ApiException {
  constructor(type?: string) {
    super(
      'INVALID_VERIFICATION_TYPE',
      type ? `Invalid verification type: ${type}` : 'Invalid verification type',
      HttpStatus.BAD_REQUEST,
    );
  }
}

// Credential Errors
export class CredentialNotFoundException extends ApiException {
  constructor(id?: string) {
    super(
      'CREDENTIAL_NOT_FOUND',
      id ? `Credential not found: ${id}` : 'Credential not found',
      HttpStatus.NOT_FOUND,
    );
  }
}

export class CredentialExpiredException extends ApiException {
  constructor() {
    super(
      'CREDENTIAL_EXPIRED',
      'Credential has expired',
      HttpStatus.GONE,
    );
  }
}

export class CredentialRevokedException extends ApiException {
  constructor() {
    super(
      'CREDENTIAL_REVOKED',
      'Credential has been revoked',
      HttpStatus.GONE,
    );
  }
}

export class UnauthorizedIssuerException extends ApiException {
  constructor() {
    super(
      'UNAUTHORIZED_ISSUER',
      'Not authorized to issue credentials',
      HttpStatus.FORBIDDEN,
    );
  }
}

// Staking Errors
export class InsufficientStakeException extends ApiException {
  constructor(required?: string, available?: string) {
    super(
      'INSUFFICIENT_STAKE',
      'Insufficient stake amount',
      HttpStatus.BAD_REQUEST,
      { required, available },
    );
  }
}

export class StakeNotFoundException extends ApiException {
  constructor() {
    super(
      'STAKE_NOT_FOUND',
      'Stake account not found',
      HttpStatus.NOT_FOUND,
    );
  }
}

export class StakeLockedException extends ApiException {
  constructor(unlockTime?: Date) {
    super(
      'STAKE_LOCKED',
      'Stake is still locked',
      HttpStatus.CONFLICT,
      { unlockTime: unlockTime?.toISOString() },
    );
  }
}

export class UnstakeAlreadyRequestedException extends ApiException {
  constructor() {
    super(
      'UNSTAKE_ALREADY_REQUESTED',
      'Unstake has already been requested',
      HttpStatus.CONFLICT,
    );
  }
}

// Authentication Errors
export class InvalidCredentialsException extends ApiException {
  constructor() {
    super(
      'INVALID_CREDENTIALS',
      'Invalid credentials provided',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class TokenExpiredException extends ApiException {
  constructor() {
    super(
      'TOKEN_EXPIRED',
      'Token has expired',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class InvalidTokenException extends ApiException {
  constructor() {
    super(
      'INVALID_TOKEN',
      'Invalid or malformed token',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class RefreshTokenRevokedException extends ApiException {
  constructor() {
    super(
      'REFRESH_TOKEN_REVOKED',
      'Refresh token has been revoked',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

// Authorization Errors
export class UnauthorizedException extends ApiException {
  constructor(message?: string) {
    super(
      'UNAUTHORIZED',
      message || 'Unauthorized access',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class ForbiddenException extends ApiException {
  constructor(resource?: string) {
    super(
      'FORBIDDEN',
      resource ? `Access denied to resource: ${resource}` : 'Access denied',
      HttpStatus.FORBIDDEN,
    );
  }
}

// Solana/Blockchain Errors
export class SolanaTransactionFailedException extends ApiException {
  constructor(signature?: string, error?: string) {
    super(
      'SOLANA_TRANSACTION_FAILED',
      'Solana transaction failed',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { signature, error },
    );
  }
}

export class SolanaAccountNotFoundException extends ApiException {
  constructor(address?: string) {
    super(
      'SOLANA_ACCOUNT_NOT_FOUND',
      address ? `Solana account not found: ${address}` : 'Solana account not found',
      HttpStatus.NOT_FOUND,
    );
  }
}

export class InsufficientSolBalanceException extends ApiException {
  constructor(required?: number, available?: number) {
    super(
      'INSUFFICIENT_SOL_BALANCE',
      'Insufficient SOL balance for transaction',
      HttpStatus.BAD_REQUEST,
      { required, available },
    );
  }
}

// API Setu Errors
export class ApiSetuException extends ApiException {
  constructor(message: string, setuError?: any) {
    super(
      'API_SETU_ERROR',
      message,
      HttpStatus.BAD_GATEWAY,
      setuError,
    );
  }
}

export class AadhaarVerificationFailedException extends ApiException {
  constructor(reason?: string) {
    super(
      'AADHAAR_VERIFICATION_FAILED',
      reason || 'Aadhaar verification failed',
      HttpStatus.BAD_REQUEST,
    );
  }
}

// Rate Limiting Errors
export class RateLimitExceededException extends ApiException {
  constructor(retryAfter?: number) {
    super(
      'RATE_LIMIT_EXCEEDED',
      'Too many requests, please try again later',
      HttpStatus.TOO_MANY_REQUESTS,
      { retryAfter },
    );
  }
}

// Validation Errors
export class ValidationException extends ApiException {
  constructor(errors: any[]) {
    super(
      'VALIDATION_ERROR',
      'Validation failed',
      HttpStatus.BAD_REQUEST,
      { errors },
    );
  }
}

// Generic Errors
export class InternalServerException extends ApiException {
  constructor(message?: string) {
    super(
      'INTERNAL_SERVER_ERROR',
      message || 'An unexpected error occurred',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class ServiceUnavailableException extends ApiException {
  constructor(service?: string) {
    super(
      'SERVICE_UNAVAILABLE',
      service ? `Service unavailable: ${service}` : 'Service temporarily unavailable',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
