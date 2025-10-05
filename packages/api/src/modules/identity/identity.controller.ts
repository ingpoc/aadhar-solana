import { Controller, Get, Post, Put, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IdentityService } from './identity.service';
import { CreateIdentityDto, PrepareTransactionDto, UpdateIdentityDto } from './identity.dto';

@ApiTags('Identity')
@Controller('identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new identity' })
  @ApiResponse({ status: 201, description: 'Identity created successfully' })
  async createIdentity(@Body() createIdentityDto: CreateIdentityDto) {
    return this.identityService.createIdentity(createIdentityDto);
  }

  @Post('prepare-transaction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Prepare unsigned transaction for user to sign' })
  @ApiResponse({ status: 200, description: 'Unsigned transaction prepared' })
  async prepareTransaction(@Body() prepareTransactionDto: PrepareTransactionDto) {
    return this.identityService.prepareCreateIdentityTransaction(prepareTransactionDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get identity by ID' })
  @ApiResponse({ status: 200, description: 'Identity found' })
  @ApiResponse({ status: 404, description: 'Identity not found' })
  async getIdentity(@Param('id') id: string) {
    return this.identityService.getIdentity(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update identity' })
  @ApiResponse({ status: 200, description: 'Identity updated successfully' })
  async updateIdentity(
    @Param('id') id: string,
    @Body() updateIdentityDto: UpdateIdentityDto,
  ) {
    return this.identityService.updateIdentity(id, updateIdentityDto);
  }

  @Post('store-aadhaar-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Store encrypted Aadhaar data on-chain' })
  @ApiResponse({ status: 200, description: 'Aadhaar data stored successfully' })
  async storeAadhaarData(
    @Body() body: { publicKey: string; aadhaarNumber: string; otp: string },
  ) {
    return this.identityService.storeAadhaarData(
      body.publicKey,
      body.aadhaarNumber,
      body.otp,
    );
  }

  @Post('store-pan-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Store encrypted PAN data' })
  @ApiResponse({ status: 200, description: 'PAN data stored successfully' })
  async storePANData(
    @Body() body: { publicKey: string; panNumber: string; fullName: string; dob: string },
  ) {
    return this.identityService.storePANData(
      body.publicKey,
      body.panNumber,
      body.fullName,
      body.dob,
    );
  }

  @Post('store-itr-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Store encrypted ITR data with ZK income proof' })
  @ApiResponse({ status: 200, description: 'ITR data stored successfully' })
  async storeITRData(
    @Body() body: { publicKey: string; panNumber: string; financialYear: string; acknowledgementNumber: string },
  ) {
    return this.identityService.storeITRData(
      body.publicKey,
      body.panNumber,
      body.financialYear,
      body.acknowledgementNumber,
    );
  }

  @Get('verification-status/:publicKey')
  @ApiOperation({ summary: 'Get verification status for all data types' })
  @ApiResponse({ status: 200, description: 'Verification status retrieved' })
  async getVerificationStatus(@Param('publicKey') publicKey: string) {
    return this.identityService.getVerificationStatus(publicKey);
  }

  @Post('grant-access')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Grant access to fields for a service' })
  @ApiResponse({ status: 200, description: 'Access granted successfully' })
  async grantAccess(
    @Body() body: { publicKey: string; serviceName: string; purpose: string; fields: string[]; expiryDays: number },
  ) {
    return this.identityService.grantAccess(
      body.publicKey,
      body.serviceName,
      body.purpose,
      body.fields,
      body.expiryDays,
    );
  }

  @Get('access-grants/:publicKey')
  @ApiOperation({ summary: 'List all access grants for an identity' })
  @ApiResponse({ status: 200, description: 'Access grants retrieved' })
  async listAccessGrants(@Param('publicKey') publicKey: string) {
    return this.identityService.listAccessGrants(publicKey);
  }

  @Post('revoke-access')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke access grant' })
  @ApiResponse({ status: 200, description: 'Access revoked successfully' })
  async revokeAccess(
    @Body() body: { publicKey: string; grantId: string },
  ) {
    return this.identityService.revokeAccess(body.publicKey, body.grantId);
  }
}
