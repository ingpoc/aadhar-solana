import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;
  const corsOrigin = configService.get<string>('corsOrigin') || '*';
  const enableSwagger = configService.get('features.enableSwagger') !== false;

  // CORS
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],
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
