# REST API Specification

## Base URL
- **Production**: `https://api.aadhaarchain.com/v1`
- **Staging**: `https://staging-api.aadhaarchain.com/v1`
- **Development**: `http://localhost:3000/v1`

## Authentication

All API requests require authentication using JWT tokens or API keys.

### JWT Authentication
```http
Authorization: Bearer <jwt_token>
```

### API Key Authentication
```http
X-API-Key: <api_key>
```

## Identity Management

### Create Identity
```http
POST /identity
```

**Request Body:**
```json
{
  "publicKey": "string",
  "did": "string",
  "metadataUri": "string",
  "recoveryKeys": ["string"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "identityId": "string",
    "did": "string",
    "status": "pending",
    "transactionSignature": "string"
  }
}
```

### Get Identity
```http
GET /identity/{identityId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "identityId": "string",
    "did": "string",
    "publicKey": "string",
    "verificationStatus": {
      "aadhaar": "verified|pending|failed",
      "pan": "verified|pending|failed",
      "education": "verified|pending|failed"
    },
    "reputationScore": 750,
    "stakedAmount": "1000000000",
    "createdAt": "2024-01-01T00:00:00Z",
    "lastUpdated": "2024-01-01T00:00:00Z"
  }
}
```

### Update Identity
```http
PUT /identity/{identityId}
```

**Request Body:**
```json
{
  "metadataUri": "string",
  "recoveryKeys": ["string"]
}
```

## Verification Services

### Request Aadhaar Verification
```http
POST /verification/aadhaar
```

**Request Body:**
```json
{
  "identityId": "string",
  "aadhaarNumber": "string",
  "consent": true,
  "otp": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verificationId": "string",
    "status": "pending",
    "estimatedCompletionTime": "2024-01-01T00:02:00Z"
  }
}
```

### Request PAN Verification
```http
POST /verification/pan
```

**Request Body:**
```json
{
  "identityId": "string",
  "panNumber": "string",
  "fullName": "string",
  "dateOfBirth": "1990-01-01"
}
```

### Get Verification Status
```http
GET /verification/{verificationId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verificationId": "string",
    "type": "aadhaar|pan|education",
    "status": "pending|completed|failed",
    "result": {
      "verified": true,
      "confidence": 0.95,
      "attributes": {
        "ageGroup": "18-25",
        "state": "DL",
        "pincode": "110001"
      }
    },
    "proofHash": "string",
    "completedAt": "2024-01-01T00:02:00Z"
  }
}
```

## Credential Management

### Issue Credential
```http
POST /credentials
```

**Request Body:**
```json
{
  "subjectId": "string",
  "credentialType": "education|employment|financial",
  "schema": "string",
  "claims": {
    "degree": "Bachelor of Engineering",
    "institution": "IIT Delhi",
    "year": "2020"
  },
  "expiresAt": "2025-01-01T00:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "credentialId": "string",
    "credentialType": "education",
    "issuedAt": "2024-01-01T00:00:00Z",
    "proofHash": "string",
    "transactionSignature": "string"
  }
}
```

### Get Credential
```http
GET /credentials/{credentialId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "credentialId": "string",
    "subjectId": "string",
    "issuerId": "string",
    "credentialType": "education",
    "claims": {
      "degree": "Bachelor of Engineering",
      "institution": "IIT Delhi",
      "year": "2020"
    },
    "issuedAt": "2024-01-01T00:00:00Z",
    "expiresAt": "2025-01-01T00:00:00Z",
    "revoked": false,
    "verifiable": true
  }
}
```

### Verify Credential
```http
POST /credentials/{credentialId}/verify
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "revoked": false,
    "expired": false,
    "issuerVerified": true,
    "signatureValid": true,
    "verifiedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Revoke Credential
```http
DELETE /credentials/{credentialId}
```

**Request Body:**
```json
{
  "reason": "credential_compromised|subject_request|issuer_decision"
}
```

## Zero-Knowledge Proofs

### Generate Proof
```http
POST /proofs/generate
```

**Request Body:**
```json
{
  "identityId": "string",
  "proofType": "age_verification|income_range|education_level",
  "parameters": {
    "minAge": 18,
    "maxAge": 65
  },
  "disclosure": {
    "revealAge": false,
    "revealRange": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "proofId": "string",
    "proof": "string",
    "publicInputs": ["string"],
    "expiresAt": "2024-01-01T01:00:00Z"
  }
}
```

### Verify Proof
```http
POST /proofs/{proofId}/verify
```

**Request Body:**
```json
{
  "proof": "string",
  "publicInputs": ["string"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "proofType": "age_verification",
    "claims": {
      "ageAbove18": true,
      "ageBelow65": true
    },
    "verifiedAt": "2024-01-01T00:00:00Z"
  }
}
```

## Reputation System

### Get Reputation Score
```http
GET /reputation/{identityId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "identityId": "string",
    "overallScore": 750,
    "breakdown": {
      "baseScore": 500,
      "verificationBonus": 200,
      "activityScore": 100,
      "penalties": 50
    },
    "percentile": 75,
    "tier": "gold",
    "lastUpdated": "2024-01-01T00:00:00Z"
  }
}
```

### Get Reputation History
```http
GET /reputation/{identityId}/history
```

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "eventType": "verification_completed",
        "scoreDelta": 100,
        "timestamp": "2024-01-01T00:00:00Z",
        "description": "Aadhaar verification completed"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100
    }
  }
}
```

## Staking

### Stake Identity
```http
POST /staking/stake
```

**Request Body:**
```json
{
  "identityId": "string",
  "amount": "1000000000",
  "lockPeriod": 2592000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stakeId": "string",
    "amount": "1000000000",
    "stakedAt": "2024-01-01T00:00:00Z",
    "unlockTime": "2024-01-31T00:00:00Z",
    "transactionSignature": "string"
  }
}
```

### Unstake Identity
```http
POST /staking/unstake
```

**Request Body:**
```json
{
  "stakeId": "string",
  "amount": "500000000"
}
```

### Get Staking Info
```http
GET /staking/{identityId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalStaked": "1000000000",
    "availableToUnstake": "500000000",
    "lockedUntil": "2024-01-31T00:00:00Z",
    "pendingRewards": "50000000",
    "stakingHistory": [
      {
        "action": "stake",
        "amount": "1000000000",
        "timestamp": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

## Enterprise APIs

### Bulk Verification
```http
POST /enterprise/verify/bulk
```

**Request Body:**
```json
{
  "verifications": [
    {
      "referenceId": "emp001",
      "identityId": "string",
      "verificationType": "employment",
      "requirements": {
        "minExperience": 2,
        "skills": ["javascript", "react"]
      }
    }
  ]
}
```

### Identity Search
```http
GET /enterprise/search
```

**Query Parameters:**
- `verificationLevel`: minimum verification level
- `reputationMin`: minimum reputation score
- `skills`: comma-separated skills
- `location`: location filter

**Response:**
```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "identityId": "string",
        "verificationLevel": "high",
        "reputationScore": 850,
        "skills": ["javascript", "react", "solana"],
        "location": "Delhi",
        "lastActive": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100
    }
  }
}
```

## WebSocket Events

### Connection
```javascript
const ws = new WebSocket('wss://api.aadhaarchain.com/ws');
```

### Event Types
```json
{
  "type": "verification_completed",
  "data": {
    "verificationId": "string",
    "status": "success|failed",
    "result": {}
  }
}

{
  "type": "reputation_updated",
  "data": {
    "identityId": "string",
    "newScore": 750,
    "change": 50
  }
}

{
  "type": "credential_issued",
  "data": {
    "credentialId": "string",
    "type": "education",
    "issuedTo": "string"
  }
}
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request body is invalid",
    "details": {
      "field": "aadhaarNumber",
      "reason": "Invalid format"
    }
  }
}
```

### Common Error Codes
- `INVALID_REQUEST`: Request validation failed
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error
- `BLOCKCHAIN_ERROR`: Solana transaction failed
- `VERIFICATION_FAILED`: External verification failed

## Rate Limiting

- **Free Tier**: 100 requests/hour
- **Basic Plan**: 1,000 requests/hour
- **Enterprise**: Custom limits

Rate limit headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## SDK Examples

### JavaScript/TypeScript
```typescript
import { AadhaarChainSDK } from '@aadhaarchain/sdk';

const sdk = new AadhaarChainSDK({
  apiKey: 'your-api-key',
  environment: 'production'
});

// Create identity
const identity = await sdk.identity.create({
  publicKey: 'user-public-key',
  did: 'did:aadhaar:user-id'
});

// Request verification
const verification = await sdk.verification.requestAadhaar({
  identityId: identity.id,
  aadhaarNumber: '1234-5678-9012',
  consent: true
});
```

### Python
```python
from aadhaarchain import AadhaarChainSDK

sdk = AadhaarChainSDK(
    api_key='your-api-key',
    environment='production'
)

# Create identity
identity = sdk.identity.create(
    public_key='user-public-key',
    did='did:aadhaar:user-id'
)

# Request verification
verification = sdk.verification.request_aadhaar(
    identity_id=identity.id,
    aadhaar_number='1234-5678-9012',
    consent=True
)
```