# CLAUDE.md - Backend API (NestJS)

## Overview

Production-ready REST API built with NestJS that serves as the application layer between clients and the Solana blockchain. Handles identity management, verification workflows, credential issuance, and reputation scoring.

## Quick Commands

```bash
# Development
yarn dev              # Start with hot-reload (ts-node-dev)
yarn start            # Start production build
yarn build            # Compile TypeScript

# Database
npx prisma migrate dev     # Run migrations (development)
npx prisma migrate deploy  # Run migrations (production)
npx prisma generate        # Generate Prisma client
npx prisma studio          # Open database GUI

# Testing
yarn test             # Run unit tests
yarn test:watch       # Watch mode
yarn test:cov         # With coverage
yarn test:e2e         # End-to-end tests
```

## Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | NestJS | 10.0.0 |
| Language | TypeScript | 5.0.0 |
| ORM | Prisma | 5.0.0 |
| Database | PostgreSQL | 14+ |
| Cache | Redis (ioredis) | 5.3.0 |
| Auth | Passport + JWT | 0.6.0 |
| Validation | class-validator | 0.14.0 |
| API Docs | Swagger/OpenAPI | Auto-generated |
| Blockchain | @solana/web3.js | 1.87.0 |

## Directory Structure

```
packages/api/
├── src/
│   ├── app.module.ts              # Root module
│   ├── main.ts                    # Application bootstrap
│   ├── modules/                   # Feature modules
│   │   ├── identity/              # Identity CRUD
│   │   │   ├── identity.module.ts
│   │   │   ├── identity.controller.ts
│   │   │   ├── identity.service.ts
│   │   │   └── dto/
│   │   │       ├── create-identity.dto.ts
│   │   │       └── update-identity.dto.ts
│   │   ├── verification/          # Aadhaar/PAN verification
│   │   ├── credentials/           # Credential management
│   │   ├── reputation/            # Reputation scoring
│   │   └── staking/               # SOL staking
│   └── services/                  # Shared services
│       ├── solana.service.ts      # Anchor program integration
│       ├── database.service.ts    # Prisma wrapper
│       ├── cache.service.ts       # Redis operations
│       └── api-setu.service.ts    # Government API (mock)
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Migration history
├── test/                          # E2E tests
├── tsconfig.json
└── package.json
```

## Code Conventions

### Module Structure
Each feature module follows this pattern:
```
module-name/
├── module-name.module.ts      # Module definition
├── module-name.controller.ts  # HTTP endpoints
├── module-name.service.ts     # Business logic
├── dto/                       # Data Transfer Objects
│   ├── create-*.dto.ts
│   ├── update-*.dto.ts
│   └── response-*.dto.ts
└── entities/                  # Type definitions (optional)
```

### Naming Conventions
- **Files**: kebab-case (`identity.service.ts`)
- **Classes**: PascalCase (`IdentityService`)
- **Methods**: camelCase (`createIdentity`)
- **DTOs**: PascalCase with Dto suffix (`CreateIdentityDto`)
- **Interfaces**: PascalCase with I prefix (`IIdentityResponse`)

### Controller Pattern
```typescript
@Controller('identity')
@ApiTags('Identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post()
  @ApiOperation({ summary: 'Create new identity' })
  @ApiResponse({ status: 201, description: 'Identity created' })
  async create(@Body() dto: CreateIdentityDto): Promise<Identity> {
    return this.identityService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get identity by ID' })
  async findOne(@Param('id') id: string): Promise<Identity> {
    return this.identityService.findOne(id);
  }
}
```

### Service Pattern
```typescript
@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly cache: CacheService,
    private readonly solana: SolanaService,
  ) {}

  async create(dto: CreateIdentityDto): Promise<Identity> {
    // 1. Validate input
    // 2. Create on-chain record
    // 3. Store in database
    // 4. Invalidate cache
    return this.prisma.identity.create({ data: dto });
  }
}
```

### DTO Validation
```typescript
import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIdentityDto {
  @ApiProperty({ description: 'User wallet address' })
  @IsString()
  walletAddress: string;

  @ApiProperty({ description: 'Full name', minLength: 2 })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;
}
```

## Database Schema

Located in `prisma/schema.prisma`:

```prisma
model User {
  id        String   @id @default(uuid())
  email     String?  @unique
  phone     String?  @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  identity  Identity?
}

model Identity {
  id                 String   @id @default(uuid())
  userId             String   @unique
  did                String   @unique
  walletAddress      String   @unique
  verificationStatus Int      @default(0)
  reputationScore    Int      @default(0)
  stakingAmount      BigInt   @default(0)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  user               User     @relation(fields: [userId], references: [id])
  credentials        Credential[]
}

model VerificationRequest {
  id              String   @id @default(uuid())
  identityId      String
  verificationType String  // 'aadhaar' | 'pan' | 'phone' | 'email'
  status          String   @default("pending")
  createdAt       DateTime @default(now())
  completedAt     DateTime?
}

model Credential {
  id          String   @id @default(uuid())
  identityId  String
  type        String
  issuer      String
  data        Json
  issuedAt    DateTime @default(now())
  expiresAt   DateTime?
  revokedAt   DateTime?
  identity    Identity @relation(fields: [identityId], references: [id])
}
```

## API Endpoints

### Identity Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/identity` | Create new identity |
| GET | `/identity/:id` | Get identity by ID |
| GET | `/identity/wallet/:address` | Get by wallet address |
| PATCH | `/identity/:id` | Update identity |
| DELETE | `/identity/:id` | Delete identity |

### Verification Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/verification/aadhaar` | Start Aadhaar verification |
| POST | `/verification/pan` | Start PAN verification |
| GET | `/verification/:id/status` | Check verification status |
| POST | `/verification/:id/complete` | Complete verification |

### Credentials Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/credentials` | Issue new credential |
| GET | `/credentials/:id` | Get credential |
| GET | `/credentials/identity/:id` | Get all for identity |
| POST | `/credentials/:id/verify` | Verify credential |
| POST | `/credentials/:id/revoke` | Revoke credential |

### Reputation Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reputation/:identityId` | Get reputation score |
| GET | `/reputation/:identityId/history` | Get score history |
| POST | `/reputation/:identityId/update` | Update score |

### Staking Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/staking/stake` | Stake SOL |
| POST | `/staking/unstake` | Unstake SOL |
| GET | `/staking/:identityId` | Get staking info |

## Environment Variables

Create `.env` file (see `.env.example`):

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/aadhaarchain"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Solana
SOLANA_RPC_URL=http://localhost:8899
ANCHOR_WALLET=/path/to/wallet.json

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRATION=24h

# API
PORT=3001
NODE_ENV=development

# API Setu (Government APIs)
API_SETU_URL=https://api.sandbox.co
API_SETU_KEY=your-api-key
```

## Solana Integration

### SolanaService
```typescript
@Injectable()
export class SolanaService {
  private connection: Connection;
  private provider: AnchorProvider;
  private programs: {
    identity: Program<IdentityRegistry>;
    verification: Program<VerificationOracle>;
    // ... other programs
  };

  async createIdentityOnChain(
    walletAddress: string,
    did: string,
  ): Promise<string> {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('identity'), new PublicKey(walletAddress).toBuffer()],
      this.programs.identity.programId,
    );

    const tx = await this.programs.identity.methods
      .createIdentity(did)
      .accounts({
        identityAccount: pda,
        authority: new PublicKey(walletAddress),
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }
}
```

## Caching Strategy

### Cache Service Usage
```typescript
@Injectable()
export class IdentityService {
  private readonly CACHE_TTL = 300; // 5 minutes

  async findOne(id: string): Promise<Identity> {
    // Try cache first
    const cached = await this.cache.get(`identity:${id}`);
    if (cached) return JSON.parse(cached);

    // Fetch from database
    const identity = await this.prisma.identity.findUnique({
      where: { id },
    });

    // Store in cache
    await this.cache.set(
      `identity:${id}`,
      JSON.stringify(identity),
      this.CACHE_TTL,
    );

    return identity;
  }
}
```

## Error Handling

### Custom Exceptions
```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

export class IdentityNotFoundException extends HttpException {
  constructor(id: string) {
    super(`Identity with ID ${id} not found`, HttpStatus.NOT_FOUND);
  }
}

export class VerificationFailedException extends HttpException {
  constructor(reason: string) {
    super(`Verification failed: ${reason}`, HttpStatus.BAD_REQUEST);
  }
}
```

### Global Exception Filter
Errors are caught and formatted consistently:
```json
{
  "statusCode": 404,
  "message": "Identity with ID xyz not found",
  "error": "Not Found",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Testing

### Unit Test Pattern
```typescript
describe('IdentityService', () => {
  let service: IdentityService;
  let prisma: DatabaseService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        IdentityService,
        {
          provide: DatabaseService,
          useValue: {
            identity: {
              create: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<IdentityService>(IdentityService);
    prisma = module.get<DatabaseService>(DatabaseService);
  });

  it('should create identity', async () => {
    const dto = { walletAddress: '...', name: 'Test' };
    jest.spyOn(prisma.identity, 'create').mockResolvedValue(mockIdentity);

    const result = await service.create(dto);
    expect(result).toEqual(mockIdentity);
  });
});
```

## Security Checklist

- [ ] Validate all inputs with `class-validator`
- [ ] Use Prisma parameterized queries (SQL injection protection)
- [ ] Implement rate limiting on public endpoints
- [ ] JWT authentication on protected routes
- [ ] No sensitive data in error messages or logs
- [ ] CORS configured for allowed origins
- [ ] Helmet middleware for security headers
- [ ] Environment variables for secrets (never in code)
