import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CredentialsService } from './credentials.service';
import { IssueCredentialDto } from './credentials.dto';

@ApiTags('Credentials')
@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Post()
  @ApiOperation({ summary: 'Issue a new credential' })
  async issueCredential(@Body() dto: IssueCredentialDto) {
    return this.credentialsService.issueCredential(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get credential by ID' })
  async getCredential(@Param('id') id: string) {
    return this.credentialsService.getCredential(id);
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify a credential' })
  async verifyCredential(@Param('id') id: string) {
    return this.credentialsService.verifyCredential(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke a credential' })
  async revokeCredential(@Param('id') id: string) {
    return this.credentialsService.revokeCredential(id);
  }
}
