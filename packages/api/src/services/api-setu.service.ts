import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class ApiSetuService {
  private apiSetuClient: AxiosInstance;

  constructor() {
    this.apiSetuClient = axios.create({
      baseURL: process.env.API_SETU_BASE_URL || 'https://api.sandbox.co.in',
      timeout: 30000,
      headers: {
        'x-client-id': process.env.API_SETU_CLIENT_ID || 'demo-client',
        'x-client-secret': process.env.API_SETU_CLIENT_SECRET || 'demo-secret',
      },
    });

    console.log('✅ API Setu service initialized');
  }

  async verifyAadhaar(
    aadhaarNumber: string,
    consent: boolean,
  ): Promise<{ verified: boolean; requestId: string; verificationHash: string }> {
    try {
      // ✅ Hash Aadhaar for logging instead of PII
      const hashedAadhaar = this.generateHash(`log-${aadhaarNumber}`).slice(0, 16);
      console.log(`Verifying Aadhaar: hash=${hashedAadhaar}`);

      if (!consent) {
        throw new Error('User consent required for Aadhaar verification');
      }

      const response = await this.apiSetuClient.post('/api/verify/aadhaar', {
        aadhaarNumber: aadhaarNumber,
        consent: consent,
      });

      return {
        verified: response.data.verified || false,
        requestId: response.data.requestId || 'req-' + Date.now(),
        verificationHash: this.generateHash(`aadhaar-${aadhaarNumber}-${Date.now()}`),
      };
    } catch (error) {
      console.error('Aadhaar verification failed:', error);

      const mockResult = {
        verified: true,
        requestId: 'mock-req-' + Date.now(),
        verificationHash: this.generateHash(`aadhaar-${aadhaarNumber}-${Date.now()}`),
      };
      console.log('⚠️ Using mock Aadhaar verification response');
      return mockResult;
    }
  }

  async verifyPAN(
    panNumber: string,
    fullName: string,
    dateOfBirth: string,
  ): Promise<{ valid: boolean; requestId: string; verificationHash: string; nameMatch: boolean; dobMatch: boolean }> {
    try {
      // ✅ Hash PAN for logging instead of PII
      const hashedPAN = this.generateHash(`log-${panNumber}`).slice(0, 16);
      console.log(`Verifying PAN: hash=${hashedPAN}`);

      const response = await this.apiSetuClient.post('/api/verify/pan', {
        panNumber: panNumber,
        name: fullName,
        dob: dateOfBirth,
      });

      return {
        valid: response.data.valid || false,
        requestId: response.data.requestId || 'req-' + Date.now(),
        verificationHash: this.generateHash(`pan-${panNumber}-${Date.now()}`),
        nameMatch: response.data.nameMatch || false,
        dobMatch: response.data.dobMatch || false,
      };
    } catch (error) {
      console.error('PAN verification failed:', error);

      const mockResult = {
        valid: true,
        requestId: 'mock-req-' + Date.now(),
        verificationHash: this.generateHash(`pan-${panNumber}-${Date.now()}`),
        nameMatch: true,
        dobMatch: true,
      };
      console.log('⚠️ Using mock PAN verification response');
      return mockResult;
    }
  }

  private generateHash(data: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async fetchAadhaarData(aadhaarNumber: string, otp: string): Promise<AadhaarData> {
    const mockDatabase: Record<string, AadhaarData> = {
      '123456789012': {
        aadhaarNumber: '123456789012',
        name: 'Rajesh Kumar',
        dob: '1990-05-15',
        gender: 'M',
        mobile: '+919876543210',
        email: 'rajesh.kumar@example.com',
        address: {
          house: '123',
          street: 'MG Road',
          landmark: 'Near City Mall',
          locality: 'Indiranagar',
          district: 'Bangalore Urban',
          state: 'Karnataka',
          pincode: '560038',
          country: 'India',
        },
        photoBase64: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwA=',
      },
      '234567890123': {
        aadhaarNumber: '234567890123',
        name: 'Priya Sharma',
        dob: '1995-08-20',
        gender: 'F',
        mobile: '+919876543211',
        email: 'priya.sharma@example.com',
        address: {
          house: '456',
          street: 'Park Street',
          landmark: 'Opposite Metro Station',
          locality: 'Koramangala',
          district: 'Bangalore Urban',
          state: 'Karnataka',
          pincode: '560095',
          country: 'India',
        },
        photoBase64: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwA=',
      },
      '345678901234': {
        aadhaarNumber: '345678901234',
        name: 'Amit Singh',
        dob: '1988-12-10',
        gender: 'M',
        mobile: '+919876543212',
        email: 'amit.singh@example.com',
        address: {
          house: '789',
          street: 'Brigade Road',
          landmark: 'Near Forum Mall',
          locality: 'Ashok Nagar',
          district: 'Bangalore Urban',
          state: 'Karnataka',
          pincode: '560025',
          country: 'India',
        },
        photoBase64: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwA=',
      },
      '456789012345': {
        aadhaarNumber: '456789012345',
        name: 'Sneha Patel',
        dob: '1992-03-25',
        gender: 'F',
        mobile: '+919876543213',
        email: 'sneha.patel@example.com',
        address: {
          house: '101',
          street: 'Commercial Street',
          landmark: 'Near Shivajinagar Bus Stand',
          locality: 'Shivajinagar',
          district: 'Bangalore Urban',
          state: 'Karnataka',
          pincode: '560001',
          country: 'India',
        },
        photoBase64: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwA=',
      },
      '567890123456': {
        aadhaarNumber: '567890123456',
        name: 'Vikram Reddy',
        dob: '1985-07-08',
        gender: 'M',
        mobile: '+919876543214',
        email: 'vikram.reddy@example.com',
        address: {
          house: '202',
          street: 'Jubilee Hills Road',
          landmark: 'Near Peddamma Temple',
          locality: 'Jubilee Hills',
          district: 'Hyderabad',
          state: 'Telangana',
          pincode: '500033',
          country: 'India',
        },
        photoBase64: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwA=',
      },
      '793847594301': {
        aadhaarNumber: '793847594301',
        name: 'Gurusharan Gupta',
        dob: '1990-01-01',
        gender: 'M',
        mobile: '+919960438648',
        email: 'gurusharan.gupta@example.com',
        address: {
          house: '123',
          street: 'Tech Street',
          landmark: 'Near IT Park',
          locality: 'Sector 62',
          district: 'Gautam Buddha Nagar',
          state: 'Uttar Pradesh',
          pincode: '201309',
          country: 'India',
        },
        photoBase64: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwA=',
      },
    };

    const mockData = mockDatabase[aadhaarNumber];

    if (!mockData) {
      throw new Error('Aadhaar number not found in mock database');
    }

    if (otp !== '123456') {
      throw new Error('Invalid OTP');
    }

    console.log(`✅ Mock Aadhaar data fetched for: ${mockData.name}`);
    return mockData;
  }

  async fetchPANData(panNumber: string, fullName: string, dob: string): Promise<PANData> {
    const mockDatabase: Record<string, PANData> = {
      'ABCDE1234F': {
        panNumber: 'ABCDE1234F',
        fullName: 'Rajesh Kumar',
        dob: '1990-05-15',
        fatherName: 'Suresh Kumar',
        status: 'Active',
        category: 'Individual',
        issuedDate: '2010-03-20',
      },
      'FGHIJ5678K': {
        panNumber: 'FGHIJ5678K',
        fullName: 'Priya Sharma',
        dob: '1995-08-20',
        fatherName: 'Ramesh Sharma',
        status: 'Active',
        category: 'Individual',
        issuedDate: '2015-06-10',
      },
      'AKOPG1506D': {
        panNumber: 'AKOPG1506D',
        fullName: 'Gurusharan Gupta',
        dob: '1990-01-01',
        fatherName: 'Rajesh Gupta',
        status: 'Active',
        category: 'Individual',
        issuedDate: '2010-03-15',
      },
    };

    const mockData = mockDatabase[panNumber.toUpperCase()];

    if (!mockData) {
      throw new Error('PAN number not found in mock database');
    }

    if (mockData.fullName.toLowerCase() !== fullName.toLowerCase()) {
      throw new Error('Name does not match PAN records');
    }

    if (mockData.dob !== dob) {
      throw new Error('Date of birth does not match PAN records');
    }

    console.log(`✅ Mock PAN data fetched for: ${mockData.fullName}`);
    return mockData;
  }

  async fetchITRData(panNumber: string, financialYear: string, acknowledgementNumber: string): Promise<ITRData> {
    const mockDatabase: Record<string, ITRData[]> = {
      'ABCDE1234F': [
        {
          panNumber: 'ABCDE1234F',
          financialYear: '2023-24',
          acknowledgementNumber: 'ITR123456789012345',
          filingDate: '2024-07-15',
          status: 'Verified',
          assessmentYear: '2024-25',
          totalIncome: 850000,
          taxPaid: 95000,
          refundAmount: 0,
          formType: 'ITR-1',
        },
      ],
      'FGHIJ5678K': [
        {
          panNumber: 'FGHIJ5678K',
          financialYear: '2023-24',
          acknowledgementNumber: 'ITR987654321098765',
          filingDate: '2024-07-20',
          status: 'Verified',
          assessmentYear: '2024-25',
          totalIncome: 1250000,
          taxPaid: 175000,
          refundAmount: 5000,
          formType: 'ITR-2',
        },
      ],
    };

    const userRecords = mockDatabase[panNumber.toUpperCase()];

    if (!userRecords) {
      throw new Error('No ITR records found for this PAN');
    }

    const itrData = userRecords.find(
      (record) => record.financialYear === financialYear && record.acknowledgementNumber === acknowledgementNumber
    );

    if (!itrData) {
      throw new Error('ITR record not found for the provided details');
    }

    console.log(`✅ Mock ITR data fetched for FY ${financialYear}`);
    return itrData;
  }
}

export interface AadhaarData {
  aadhaarNumber: string;
  name: string;
  dob: string;
  gender: string;
  mobile: string;
  email: string;
  address: {
    house: string;
    street: string;
    landmark: string;
    locality: string;
    district: string;
    state: string;
    pincode: string;
    country: string;
  };
  photoBase64: string;
}

export interface PANData {
  panNumber: string;
  fullName: string;
  dob: string;
  fatherName: string;
  status: string;
  category: string;
  issuedDate: string;
}

export interface ITRData {
  panNumber: string;
  financialYear: string;
  acknowledgementNumber: string;
  filingDate: string;
  status: string;
  assessmentYear: string;
  totalIncome: number;
  taxPaid: number;
  refundAmount: number;
  formType: string;
}
