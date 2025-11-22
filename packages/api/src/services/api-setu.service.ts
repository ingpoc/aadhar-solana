import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import * as crypto from 'crypto';
import {
  ApiSetuException,
  AadhaarVerificationFailedException,
} from '../common/exceptions/api.exception';

export interface AadhaarVerificationRequest {
  aadhaarNumber: string;
  consent: boolean;
  purpose?: string;
}

export interface AadhaarOtpResponse {
  requestId: string;
  message: string;
  txnId: string;
}

export interface AadhaarVerificationResult {
  verified: boolean;
  requestId: string;
  verificationHash: string;
  demographic?: {
    name: string;
    gender: string;
    dob: string;
    address?: {
      house?: string;
      street?: string;
      locality?: string;
      district?: string;
      state?: string;
      pincode?: string;
    };
  };
  photo?: string; // Base64 encoded photo (optional, requires consent)
}

export interface PANVerificationResult {
  valid: boolean;
  requestId: string;
  verificationHash: string;
  nameMatch: boolean;
  dobMatch: boolean;
  panStatus: 'ACTIVE' | 'INACTIVE' | 'NOT_FOUND';
  panHolderName?: string;
}

export interface DigiLockerDocument {
  docType: string;
  docId: string;
  issuer: string;
  issuedDate: string;
  uri: string;
}

@Injectable()
export class ApiSetuService implements OnModuleInit {
  private readonly logger = new Logger(ApiSetuService.name);
  private apiSetuClient: AxiosInstance;
  private digiLockerClient: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const baseUrl = this.configService.get<string>('apiSetu.baseUrl');
    const clientId = this.configService.get<string>('apiSetu.clientId');
    const clientSecret = this.configService.get<string>('apiSetu.clientSecret');

    this.apiSetuClient = axios.create({
      baseURL: baseUrl || 'https://dg-sandbox.setu.co',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.apiSetuClient.interceptors.request.use(async (config) => {
      if (clientId && clientSecret) {
        const token = await this.getAccessToken();
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.apiSetuClient.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        this.logger.error(`API Setu error: ${error.message}`, error.response?.data);
        throw error;
      },
    );

    // DigiLocker client
    const digiLockerClientId = this.configService.get<string>('digilocker.clientId');
    if (digiLockerClientId) {
      this.digiLockerClient = axios.create({
        baseURL: 'https://api.digitallocker.gov.in',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    this.logger.log(`API Setu service initialized - ${baseUrl}`);
  }

  // ============== Authentication ==============

  private async getAccessToken(): Promise<string> {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const clientId = this.configService.get<string>('apiSetu.clientId');
    const clientSecret = this.configService.get<string>('apiSetu.clientSecret');

    if (!clientId || !clientSecret) {
      throw new ApiSetuException('API Setu credentials not configured');
    }

    try {
      const response = await axios.post(
        `${this.configService.get('apiSetu.baseUrl')}/api/v2/aa/token`,
        {
          clientID: clientId,
          secret: clientSecret,
        },
      );

      this.accessToken = response.data.accessToken;
      // Token usually valid for 30 minutes, refresh 5 minutes early
      this.tokenExpiry = new Date(Date.now() + 25 * 60 * 1000);

      return this.accessToken;
    } catch (error) {
      throw new ApiSetuException('Failed to obtain API Setu access token', error.response?.data);
    }
  }

  // ============== Aadhaar Verification ==============

  async initiateAadhaarOTP(aadhaarNumber: string, consent: boolean): Promise<AadhaarOtpResponse> {
    if (!consent) {
      throw new AadhaarVerificationFailedException('User consent is required for Aadhaar verification');
    }

    // Validate Aadhaar number format
    if (!this.isValidAadhaar(aadhaarNumber)) {
      throw new AadhaarVerificationFailedException('Invalid Aadhaar number format');
    }

    const maskedAadhaar = this.maskAadhaar(aadhaarNumber);
    this.logger.log(`Initiating Aadhaar OTP for: ${maskedAadhaar}`);

    try {
      const response = await this.apiSetuClient.post('/api/v2/aadhaar/okyc/otp', {
        aadhaarNumber: aadhaarNumber,
        consent: 'Y',
        reason: 'Identity verification for AadhaarChain platform',
      });

      return {
        requestId: response.data.requestId || response.data.reference_id,
        message: response.data.message || 'OTP sent successfully',
        txnId: response.data.txnId || response.data.transaction_id,
      };
    } catch (error) {
      // In sandbox/development, return mock response
      if (this.configService.get('nodeEnv') !== 'production') {
        this.logger.warn('Using mock OTP response (non-production)');
        return {
          requestId: `mock-${Date.now()}`,
          message: 'OTP sent to registered mobile',
          txnId: `txn-${Date.now()}`,
        };
      }
      throw new ApiSetuException('Failed to initiate Aadhaar OTP', error.response?.data);
    }
  }

  async verifyAadhaarOTP(
    requestId: string,
    otp: string,
    txnId: string,
  ): Promise<AadhaarVerificationResult> {
    this.logger.log(`Verifying Aadhaar OTP for request: ${requestId}`);

    try {
      const response = await this.apiSetuClient.post('/api/v2/aadhaar/okyc/otp/verify', {
        requestId,
        otp,
        txnId,
      });

      const data = response.data;

      return {
        verified: true,
        requestId,
        verificationHash: this.generateVerificationHash(data),
        demographic: {
          name: data.name || data.full_name,
          gender: data.gender,
          dob: data.dob || data.date_of_birth,
          address: data.address ? {
            house: data.address.house,
            street: data.address.street,
            locality: data.address.locality || data.address.vtc,
            district: data.address.district,
            state: data.address.state,
            pincode: data.address.pincode,
          } : undefined,
        },
        photo: data.photo, // Base64 encoded
      };
    } catch (error) {
      // In sandbox/development, return mock response
      if (this.configService.get('nodeEnv') !== 'production') {
        this.logger.warn('Using mock verification response (non-production)');
        return {
          verified: true,
          requestId,
          verificationHash: this.generateVerificationHash({ requestId, otp, timestamp: Date.now() }),
          demographic: {
            name: 'Test User',
            gender: 'M',
            dob: '1990-01-01',
            address: {
              locality: 'Test Locality',
              district: 'Test District',
              state: 'Test State',
              pincode: '110001',
            },
          },
        };
      }
      throw new AadhaarVerificationFailedException('OTP verification failed');
    }
  }

  async verifyAadhaar(
    aadhaarNumber: string,
    consent: boolean,
  ): Promise<AadhaarVerificationResult> {
    if (!consent) {
      throw new AadhaarVerificationFailedException('User consent is required');
    }

    const maskedAadhaar = this.maskAadhaar(aadhaarNumber);
    this.logger.log(`Direct Aadhaar verification: ${maskedAadhaar}`);

    try {
      const response = await this.apiSetuClient.post('/api/v2/aadhaar/verification', {
        aadhaarNumber,
        consent: 'Y',
      });

      return {
        verified: response.data.verified || response.data.status === 'success',
        requestId: response.data.requestId || `req-${Date.now()}`,
        verificationHash: this.generateVerificationHash(response.data),
      };
    } catch (error) {
      // Fallback for non-production
      if (this.configService.get('nodeEnv') !== 'production') {
        this.logger.warn('Using mock Aadhaar verification (non-production)');
        return {
          verified: true,
          requestId: `mock-${Date.now()}`,
          verificationHash: this.generateVerificationHash({ aadhaar: maskedAadhaar, timestamp: Date.now() }),
        };
      }
      throw new AadhaarVerificationFailedException('Aadhaar verification failed');
    }
  }

  // ============== PAN Verification ==============

  async verifyPAN(
    panNumber: string,
    fullName: string,
    dateOfBirth?: string,
  ): Promise<PANVerificationResult> {
    if (!this.isValidPAN(panNumber)) {
      throw new ApiSetuException('Invalid PAN number format');
    }

    const maskedPAN = this.maskPAN(panNumber);
    this.logger.log(`Verifying PAN: ${maskedPAN}`);

    try {
      const response = await this.apiSetuClient.post('/api/v2/pan/verification', {
        panNumber: panNumber.toUpperCase(),
        name: fullName,
        dob: dateOfBirth,
      });

      const data = response.data;

      return {
        valid: data.valid || data.status === 'VALID',
        requestId: data.requestId || `req-${Date.now()}`,
        verificationHash: this.generateVerificationHash(data),
        nameMatch: data.nameMatch || this.fuzzyNameMatch(fullName, data.registeredName),
        dobMatch: data.dobMatch || (dateOfBirth === data.dateOfBirth),
        panStatus: data.status || 'ACTIVE',
        panHolderName: data.registeredName || data.name,
      };
    } catch (error) {
      // Fallback for non-production
      if (this.configService.get('nodeEnv') !== 'production') {
        this.logger.warn('Using mock PAN verification (non-production)');
        return {
          valid: true,
          requestId: `mock-${Date.now()}`,
          verificationHash: this.generateVerificationHash({ pan: maskedPAN, timestamp: Date.now() }),
          nameMatch: true,
          dobMatch: true,
          panStatus: 'ACTIVE',
          panHolderName: fullName,
        };
      }
      throw new ApiSetuException('PAN verification failed', error.response?.data);
    }
  }

  // ============== DigiLocker Integration ==============

  async getDigiLockerAuthUrl(callbackUrl: string): Promise<string> {
    const clientId = this.configService.get<string>('digilocker.clientId');
    if (!clientId) {
      throw new ApiSetuException('DigiLocker not configured');
    }

    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = `https://api.digitallocker.gov.in/public/oauth2/1/authorize?` +
      `response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}` +
      `&state=${state}`;

    return authUrl;
  }

  async exchangeDigiLockerCode(code: string): Promise<{ accessToken: string; expiresIn: number }> {
    const clientId = this.configService.get<string>('digilocker.clientId');
    const clientSecret = this.configService.get<string>('digilocker.clientSecret');
    const redirectUri = this.configService.get<string>('digilocker.redirectUri');

    const response = await this.digiLockerClient.post('/public/oauth2/1/token', {
      code,
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in,
    };
  }

  async fetchDigiLockerDocuments(accessToken: string): Promise<DigiLockerDocument[]> {
    const response = await this.digiLockerClient.get('/public/oauth2/1/files/issued', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return response.data.items.map((doc: any) => ({
      docType: doc.doctype,
      docId: doc.id,
      issuer: doc.issuer,
      issuedDate: doc.date,
      uri: doc.uri,
    }));
  }

  // ============== Utility Methods ==============

  private isValidAadhaar(aadhaar: string): boolean {
    // Aadhaar is 12 digits
    return /^\d{12}$/.test(aadhaar);
  }

  private isValidPAN(pan: string): boolean {
    // PAN format: AAAAA9999A
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(pan);
  }

  private maskAadhaar(aadhaar: string): string {
    return `${aadhaar.slice(0, 4)}****${aadhaar.slice(-4)}`;
  }

  private maskPAN(pan: string): string {
    return `${pan.slice(0, 3)}****${pan.slice(-3)}`;
  }

  private fuzzyNameMatch(name1: string, name2: string): boolean {
    if (!name1 || !name2) return false;
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
    const n1 = normalize(name1);
    const n2 = normalize(name2);
    // Simple containment check - real implementation would use Levenshtein distance
    return n1.includes(n2) || n2.includes(n1) || n1 === n2;
  }

  private generateVerificationHash(data: any): string {
    const payload = JSON.stringify(data) + Date.now();
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  // Get verification status from hash
  getVerificationStatus(hash: string): { valid: boolean; timestamp?: number } {
    // In production, this would check against stored verification records
    return { valid: hash.length === 64 };
  }
}
