# Contributing Guide

## Welcome Contributors!

Thank you for your interest in contributing to AadhaarChain! This guide will help you understand our development process, coding standards, and how to submit contributions effectively.

## Code of Conduct

### Our Commitment
We are committed to providing a welcoming and inclusive environment for all contributors, regardless of background, experience level, or identity.

### Expected Behavior
- **Be Respectful**: Treat all community members with respect and kindness
- **Be Collaborative**: Work together constructively and help others learn
- **Be Patient**: Remember that people have different experience levels and contexts
- **Be Inclusive**: Use welcoming language and help create an inclusive environment

### Unacceptable Behavior
- Harassment, discrimination, or offensive comments
- Personal attacks or trolling
- Spam or irrelevant content
- Sharing others' private information without consent

## Getting Started

### Development Environment
Before contributing, ensure you have completed the [Setup Guide](./setup-guide.md).

### Finding Issues to Work On
1. **Good First Issues**: Look for issues labeled `good-first-issue`
2. **Help Wanted**: Check issues labeled `help-wanted`
3. **Feature Requests**: Browse issues labeled `enhancement`
4. **Bug Reports**: Fix issues labeled `bug`

### Issue Labels
- `good-first-issue`: Perfect for new contributors
- `help-wanted`: Community help needed
- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements to docs
- `security`: Security-related issues
- `priority-high`: Critical issues
- `frontend`: Web/mobile frontend work
- `backend`: API/server work
- `blockchain`: Solana program work

## Development Workflow

### 1. Fork and Clone
```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/aadhaar-solana.git
cd aadhaar-solana

# Add upstream remote
git remote add upstream https://github.com/aadhaarchain/aadhaar-solana.git
```

### 2. Create Feature Branch
```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
```

### 3. Make Changes
```bash
# Make your changes
# Follow coding standards below

# Test your changes
yarn test
yarn lint
yarn type-check
```

### 4. Commit Changes
```bash
# Stage changes
git add .

# Commit with conventional message
git commit -m "feat: add user profile management"
```

### 5. Push and Create PR
```bash
# Push to your fork
git push origin feature/your-feature-name

# Create Pull Request on GitHub
```

## Coding Standards

### General Principles
1. **Clarity over Cleverness**: Write code that's easy to understand
2. **Consistency**: Follow existing patterns in the codebase
3. **Security First**: Always consider security implications
4. **Performance**: Write efficient code, but prioritize readability
5. **Documentation**: Comment complex logic and public APIs

### TypeScript/JavaScript Standards

#### Code Style
```typescript
// ✅ Good: Clear, typed, well-documented
interface UserProfile {
  id: string;
  name: string;
  verificationStatus: VerificationStatus;
  createdAt: Date;
}

/**
 * Creates a new user profile with initial verification status
 * @param userData - User information from registration
 * @returns Promise resolving to created profile
 */
async function createUserProfile(
  userData: CreateUserRequest
): Promise<UserProfile> {
  const profile: UserProfile = {
    id: generateId(),
    name: userData.name,
    verificationStatus: VerificationStatus.Pending,
    createdAt: new Date()
  };

  return await userRepository.create(profile);
}

// ❌ Bad: Unclear, untyped, no documentation
async function createUser(data: any) {
  const user = {
    id: Math.random().toString(),
    name: data.name,
    status: 'pending',
    created: new Date()
  };
  return db.save(user);
}
```

#### Naming Conventions
```typescript
// Variables and functions: camelCase
const userProfile = getUserProfile();
const isVerified = checkVerificationStatus();

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.aadhaarchain.com';

// Types and interfaces: PascalCase
interface UserCredential {
  type: CredentialType;
  issuer: string;
}

// Enums: PascalCase
enum VerificationStatus {
  Pending = 'pending',
  Verified = 'verified',
  Failed = 'failed'
}

// Files: kebab-case
user-profile.service.ts
verification-status.types.ts
```

#### Error Handling
```typescript
// ✅ Good: Specific error types with context
class VerificationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'VerificationError';
  }
}

async function verifyAadhaar(aadhaarNumber: string): Promise<VerificationResult> {
  try {
    const result = await apiSetu.verify(aadhaarNumber);
    return result;
  } catch (error) {
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      throw new VerificationError(
        'Too many verification attempts',
        'RATE_LIMIT',
        true
      );
    }

    throw new VerificationError(
      'Verification failed',
      'VERIFICATION_FAILED',
      false
    );
  }
}

// ❌ Bad: Generic error handling
async function verifyAadhaar(aadhaarNumber: string) {
  try {
    return await apiSetu.verify(aadhaarNumber);
  } catch (error) {
    throw new Error('Something went wrong');
  }
}
```

### Rust Standards (Solana Programs)

#### Code Style
```rust
// ✅ Good: Clear structure, proper error handling
use anchor_lang::prelude::*;

#[error_code]
pub enum IdentityError {
    #[msg("Invalid authority for this operation")]
    InvalidAuthority,
    #[msg("Identity already exists")]
    IdentityExists,
    #[msg("Insufficient reputation score")]
    InsufficientReputation,
}

#[derive(Accounts)]
pub struct CreateIdentity<'info> {
    #[account(
        init,
        payer = authority,
        space = IdentityAccount::LEN,
        seeds = [b"identity", authority.key().as_ref()],
        bump
    )]
    pub identity: Account<'info, IdentityAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Creates a new identity account for the given authority
///
/// # Arguments
/// * `ctx` - The context containing accounts
/// * `did` - The decentralized identifier string
/// * `metadata_uri` - URI pointing to additional metadata
///
/// # Returns
/// * `Result<()>` - Success or error
pub fn create_identity(
    ctx: Context<CreateIdentity>,
    did: String,
    metadata_uri: String,
) -> Result<()> {
    require!(did.len() <= 64, IdentityError::InvalidDid);
    require!(metadata_uri.len() <= 256, IdentityError::InvalidMetadataUri);

    let identity = &mut ctx.accounts.identity;
    identity.authority = ctx.accounts.authority.key();
    identity.did = did;
    identity.metadata_uri = metadata_uri;
    identity.created_at = Clock::get()?.unix_timestamp;
    identity.bump = *ctx.bumps.get("identity").unwrap();

    Ok(())
}
```

#### Naming Conventions
```rust
// Structs and enums: PascalCase
pub struct IdentityAccount {
    pub authority: Pubkey,
    pub did: String,
}

pub enum VerificationStatus {
    Pending,
    Verified,
    Failed,
}

// Functions and variables: snake_case
pub fn create_identity() -> Result<()> {
    let new_identity = IdentityAccount::new();
    Ok(())
}

// Constants: UPPER_SNAKE_CASE
pub const MAX_DID_LENGTH: usize = 64;
pub const IDENTITY_SEED: &[u8] = b"identity";
```

### React/React Native Standards

#### Component Structure
```typescript
// ✅ Good: Well-structured component
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface UserProfileProps {
  userId: string;
  onVerificationComplete?: (status: VerificationStatus) => void;
}

interface UserProfileState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

/**
 * UserProfile component displays user verification status and details
 */
export const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  onVerificationComplete
}) => {
  const [state, setState] = useState<UserProfileState>({
    profile: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const profile = await userService.getProfile(userId);
      setState(prev => ({ ...prev, profile, loading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  if (state.loading) {
    return <LoadingSpinner />;
  }

  if (state.error) {
    return <ErrorMessage message={state.error} onRetry={loadUserProfile} />;
  }

  if (!state.profile) {
    return <EmptyState message="Profile not found" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{state.profile.name}</Text>
      <VerificationBadge status={state.profile.verificationStatus} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});
```

### Database Standards

#### Migration Files
```sql
-- migrations/001_create_users_table.sql
-- ✅ Good: Clear, reversible migration

-- Up migration
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(15) NOT NULL UNIQUE,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reputation_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_verification_status
    CHECK (verification_status IN ('pending', 'verified', 'failed')),
  CONSTRAINT valid_reputation_score
    CHECK (reputation_score >= 0)
);

CREATE INDEX idx_users_phone_number ON users(phone_number);
CREATE INDEX idx_users_verification_status ON users(verification_status);

-- Down migration
DROP TABLE IF EXISTS users;
```

#### Query Patterns
```typescript
// ✅ Good: Type-safe, efficient queries
interface GetUsersOptions {
  verificationStatus?: VerificationStatus;
  minReputationScore?: number;
  limit?: number;
  offset?: number;
}

async function getUsers(options: GetUsersOptions = {}): Promise<User[]> {
  const query = db
    .selectFrom('users')
    .selectAll()
    .orderBy('created_at', 'desc');

  if (options.verificationStatus) {
    query.where('verification_status', '=', options.verificationStatus);
  }

  if (options.minReputationScore !== undefined) {
    query.where('reputation_score', '>=', options.minReputationScore);
  }

  if (options.limit) {
    query.limit(options.limit);
  }

  if (options.offset) {
    query.offset(options.offset);
  }

  return await query.execute();
}
```

## Testing Standards

### Unit Testing
```typescript
// ✅ Good: Comprehensive test coverage
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UserService } from '../user.service';
import { mockUserRepository } from '../__mocks__/user.repository';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserService(mockUserRepository);
  });

  describe('createUser', () => {
    it('should create user with valid data', async () => {
      // Arrange
      const userData = {
        phoneNumber: '+919876543210',
        name: 'Test User'
      };
      const expectedUser = {
        id: 'user-123',
        ...userData,
        verificationStatus: 'pending',
        createdAt: new Date()
      };
      mockUserRepository.create.mockResolvedValue(expectedUser);

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining(userData)
      );
    });

    it('should throw error for invalid phone number', async () => {
      // Arrange
      const userData = {
        phoneNumber: 'invalid-phone',
        name: 'Test User'
      };

      // Act & Assert
      await expect(userService.createUser(userData))
        .rejects
        .toThrow('Invalid phone number format');
    });
  });
});
```

### Integration Testing
```typescript
// ✅ Good: End-to-end test scenarios
import { describe, it, expect } from '@jest/globals';
import { testClient } from '../test-utils/api-client';
import { setupTestDatabase, cleanupTestDatabase } from '../test-utils/database';

describe('User API Integration', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  it('should complete user registration flow', async () => {
    // 1. Request phone verification
    const phoneResponse = await testClient.post('/auth/phone', {
      phoneNumber: '+919876543210'
    });
    expect(phoneResponse.status).toBe(200);
    expect(phoneResponse.data.verificationId).toBeDefined();

    // 2. Verify phone with OTP
    const verifyResponse = await testClient.post('/auth/verify-phone', {
      verificationId: phoneResponse.data.verificationId,
      otp: '123456' // Test OTP
    });
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.data.token).toBeDefined();

    // 3. Create user profile
    const profileResponse = await testClient.post('/users/profile', {
      name: 'Test User'
    }, {
      headers: { Authorization: `Bearer ${verifyResponse.data.token}` }
    });
    expect(profileResponse.status).toBe(201);
    expect(profileResponse.data.user.name).toBe('Test User');
  });
});
```

## Commit Message Guidelines

### Conventional Commits
We use [Conventional Commits](https://www.conventionalcommits.org/) for consistent commit messages:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks
- `security`: Security improvements
- `perf`: Performance improvements

### Examples
```bash
# ✅ Good commit messages
feat(auth): add biometric authentication support
fix(api): resolve race condition in verification process
docs(readme): update installation instructions
test(user): add unit tests for user service
security(encryption): upgrade to AES-256-GCM

# ❌ Bad commit messages
fix stuff
update code
wip
changes
```

## Pull Request Guidelines

### PR Title
Use the same format as commit messages:
```
feat(verification): add Aadhaar verification via API Setu
```

### PR Description Template
```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Security improvement

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Security review completed (if applicable)

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No sensitive data in commits
- [ ] Breaking changes documented

## Screenshots (if applicable)
Add screenshots for UI changes.

## Related Issues
Closes #123
Fixes #456
```

### Review Process
1. **Automated Checks**: All CI/CD checks must pass
2. **Code Review**: At least one team member must approve
3. **Security Review**: Required for security-related changes
4. **Documentation**: Must be updated for new features
5. **Testing**: Adequate test coverage required

## Documentation Standards

### API Documentation
```typescript
/**
 * Verifies user's Aadhaar details using API Setu
 *
 * @param aadhaarNumber - 12-digit Aadhaar number
 * @param otp - OTP received on registered mobile
 * @returns Promise resolving to verification result
 *
 * @throws {VerificationError} When verification fails
 * @throws {RateLimitError} When rate limit exceeded
 *
 * @example
 * ```typescript
 * const result = await verifyAadhaar('123456789012', '123456');
 * if (result.verified) {
 *   console.log('Verification successful');
 * }
 * ```
 */
export async function verifyAadhaar(
  aadhaarNumber: string,
  otp: string
): Promise<VerificationResult> {
  // Implementation
}
```

### README Standards
- Clear project description
- Installation instructions
- Usage examples
- Contributing guidelines
- License information

## Security Guidelines

### Code Security
1. **No Secrets in Code**: Never commit API keys, passwords, or private keys
2. **Input Validation**: Always validate and sanitize user inputs
3. **Error Handling**: Don't expose sensitive information in error messages
4. **Dependencies**: Keep dependencies updated and audit regularly

### Data Privacy
1. **Minimal Data**: Collect only necessary data
2. **Encryption**: Encrypt sensitive data at rest and in transit
3. **Access Control**: Implement proper authorization
4. **Audit Logs**: Log security-relevant events

### Example Security Review Checklist
```markdown
## Security Review Checklist

### Input Validation
- [ ] All user inputs validated
- [ ] SQL injection protection
- [ ] XSS prevention
- [ ] CSRF protection

### Authentication & Authorization
- [ ] Proper authentication flow
- [ ] Authorization checks implemented
- [ ] Session management secure
- [ ] Rate limiting implemented

### Data Protection
- [ ] Sensitive data encrypted
- [ ] PII handling compliant
- [ ] Secure data transmission
- [ ] Proper error handling

### Dependencies
- [ ] No known vulnerabilities
- [ ] Dependencies up to date
- [ ] Security headers implemented
- [ ] HTTPS enforced
```

## Release Process

### Version Numbering
We follow [Semantic Versioning](https://semver.org/):
- `MAJOR.MINOR.PATCH` (e.g., 1.2.3)
- `MAJOR`: Breaking changes
- `MINOR`: New features (backward compatible)
- `PATCH`: Bug fixes (backward compatible)

### Release Checklist
1. Update version numbers
2. Update CHANGELOG.md
3. Run full test suite
4. Security audit
5. Create release branch
6. Deploy to staging
7. Create GitHub release
8. Deploy to production

## Getting Help

### Resources
- **Documentation**: Check `.docs/` directory
- **GitHub Issues**: Search existing issues first
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join our Discord server for real-time help

### Asking for Help
When asking for help, please provide:
1. Clear description of the problem
2. Steps to reproduce
3. Expected vs actual behavior
4. Environment details
5. Relevant code snippets
6. Error messages

Thank you for contributing to AadhaarChain! Your efforts help build a more secure and accessible digital identity platform for India and the world.