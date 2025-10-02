import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { AadhaarVerificationDto, PANVerificationDto } from './verification.dto';

@ApiTags('Verification')
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('aadhaar')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request Aadhaar verification' })
  @ApiResponse({ status: 201, description: 'Verification request created' })
  async requestAadhaarVerification(@Body() dto: AadhaarVerificationDto) {
    return this.verificationService.requestAadhaarVerification(dto);
  }

  @Post('pan')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request PAN verification' })
  @ApiResponse({ status: 201, description: 'Verification request created' })
  async requestPANVerification(@Body() dto: PANVerificationDto) {
    return this.verificationService.requestPANVerification(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get verification status' })
  @ApiResponse({ status: 200, description: 'Verification status retrieved' })
  async getVerificationStatus(@Param('id') id: string) {
    return this.verificationService.getVerificationStatus(id);
  }
}
