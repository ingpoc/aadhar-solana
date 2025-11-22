import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConsentService } from './consent.service';
import { GrantConsentDto, RevokeConsentDto, ConsentQueryDto } from './dto';
import { ConsentType } from './interfaces/consent.interfaces';

@ApiTags('Consent')
@Controller('consent')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Get('purposes')
  @ApiOperation({
    summary: 'Get all consent purposes',
    description: 'Returns all available consent types with descriptions and data elements',
  })
  @ApiResponse({ status: 200, description: 'List of consent purposes' })
  getAllPurposes() {
    return {
      success: true,
      data: this.consentService.getAllPurposes(),
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get user consents',
    description: 'Returns all consents for the current user',
  })
  @ApiResponse({ status: 200, description: 'List of user consents' })
  async getMyConsents(
    @CurrentUser() user: any,
    @Query() query: ConsentQueryDto,
  ) {
    const consents = await this.consentService.getUserConsents(user.id, {
      includeRevoked: query.includeRevoked,
      includeExpired: query.includeExpired,
    });

    return {
      success: true,
      data: consents,
      count: consents.length,
    };
  }

  @Get('check/:type')
  @ApiOperation({
    summary: 'Check consent status',
    description: 'Check if user has active consent for a specific purpose',
  })
  @ApiParam({ name: 'type', enum: ConsentType })
  @ApiResponse({ status: 200, description: 'Consent status' })
  async checkConsent(
    @CurrentUser() user: any,
    @Param('type') type: ConsentType,
  ) {
    const hasConsent = await this.consentService.hasConsent(user.id, type);
    const consent = hasConsent
      ? await this.consentService.getActiveConsent(user.id, type)
      : null;

    return {
      success: true,
      data: {
        hasConsent,
        consent,
        purpose: this.consentService.getPurposeDefinition(type),
      },
    };
  }

  @Post('grant')
  @ApiOperation({
    summary: 'Grant consent',
    description: 'Grant consent for a specific purpose',
  })
  @ApiResponse({ status: 201, description: 'Consent granted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid consent type or consent already exists' })
  async grantConsent(
    @CurrentUser() user: any,
    @Body() dto: GrantConsentDto,
    @Req() req: any,
  ) {
    const consent = await this.consentService.grantConsent(user.id, dto.consentType, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      identityId: dto.identityId,
      customPurpose: dto.customPurpose,
      expiresInDays: dto.expiresInDays,
    });

    return {
      success: true,
      message: 'Consent granted successfully',
      data: consent,
    };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Revoke consent',
    description: 'Revoke a previously granted consent',
  })
  @ApiParam({ name: 'id', description: 'Consent ID' })
  @ApiResponse({ status: 200, description: 'Consent revoked successfully' })
  @ApiResponse({ status: 404, description: 'Consent not found' })
  async revokeConsent(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) consentId: string,
    @Body() dto: RevokeConsentDto,
    @Req() req: any,
  ) {
    const consent = await this.consentService.revokeConsent(
      user.id,
      consentId,
      dto.reason,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );

    return {
      success: true,
      message: 'Consent revoked successfully',
      data: consent,
    };
  }

  @Get(':id/receipt')
  @ApiOperation({
    summary: 'Get consent receipt',
    description: 'Generate a consent receipt for proof of consent',
  })
  @ApiParam({ name: 'id', description: 'Consent ID' })
  @ApiResponse({ status: 200, description: 'Consent receipt' })
  @ApiResponse({ status: 404, description: 'Consent not found' })
  async getConsentReceipt(@Param('id', ParseUUIDPipe) consentId: string) {
    const result = await this.consentService.generateConsentReceipt(consentId);

    return {
      success: true,
      data: result,
    };
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get consent history',
    description: 'Get full consent history for audit purposes',
  })
  @ApiResponse({ status: 200, description: 'Consent history' })
  async getConsentHistory(
    @CurrentUser() user: any,
    @Query('type') type?: ConsentType,
  ) {
    const history = await this.consentService.getConsentHistory(user.id, type);

    return {
      success: true,
      data: history,
      count: history.length,
    };
  }
}
