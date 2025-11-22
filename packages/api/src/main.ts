import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import hpp from 'hpp';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import {
  SecurityMiddleware,
  RequestIdMiddleware,
  IpExtractionMiddleware,
} from './common/middleware/security.middleware';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;
  const corsOrigin = configService.get<string>('corsOrigin') || '*';
  const enableSwagger = configService.get('features.enableSwagger') !== false;

  // Security middleware - Helmet for security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // For Swagger UI
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // For Swagger UI
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'https:', 'data:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Required for some API integrations
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // HTTP Parameter Pollution protection
  app.use(hpp());

  // Apply custom security middleware
  const securityMiddleware = new SecurityMiddleware();
  const requestIdMiddleware = new RequestIdMiddleware();
  const ipExtractionMiddleware = new IpExtractionMiddleware();

  app.use((req: any, res: any, next: any) => requestIdMiddleware.use(req, res, next));
  app.use((req: any, res: any, next: any) => ipExtractionMiddleware.use(req, res, next));
  app.use((req: any, res: any, next: any) => securityMiddleware.use(req, res, next));

  // CORS - Production-ready configuration
  const isProduction = configService.get('nodeEnv') === 'production';
  app.enableCors({
    origin: isProduction
      ? corsOrigin.split(',').map((o: string) => o.trim())
      : corsOrigin === '*' ? true : corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],
    exposedHeaders: ['X-Request-ID'],
    maxAge: 600, // Cache preflight requests for 10 minutes
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters and interceptors
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(),
  );

  // Swagger documentation
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('AadhaarChain API')
      .setDescription(`
## AadhaarChain - Decentralized Identity Platform

Self-sovereign identity platform built on Solana blockchain with Aadhaar integration.

### Features
- **Identity Management**: Create and manage decentralized identities
- **Aadhaar Verification**: Integrate with API Setu for Aadhaar e-KYC
- **Verifiable Credentials**: Issue and verify W3C compliant credentials
- **Reputation System**: On-chain reputation scoring
- **Staking**: Stake tokens for network participation

### Authentication
Use Bearer token authentication. Obtain tokens via the /auth endpoints.

### Rate Limiting
- Default: 100 requests per minute
- With API Key: 1000 requests per minute
      `)
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token',
        },
        'JWT',
      )
      .addApiKey(
        {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
          description: 'API Key for server-to-server authentication',
        },
        'API-Key',
      )
      .addTag('Identity', 'Identity management endpoints')
      .addTag('Verification', 'Aadhaar and document verification')
      .addTag('Credentials', 'Verifiable credentials management')
      .addTag('Reputation', 'Reputation scoring system')
      .addTag('Staking', 'Token staking operations')
      .addTag('Auth', 'Authentication endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    logger.log(`Swagger documentation: http://localhost:${port}/api/docs`);
  }

  await app.listen(port);

  logger.log(`AadhaarChain API running on port ${port}`);
  logger.log(`Environment: ${configService.get('nodeEnv')}`);
  logger.log(`Solana Network: ${configService.get('solana.network')}`);
}

bootstrap();
