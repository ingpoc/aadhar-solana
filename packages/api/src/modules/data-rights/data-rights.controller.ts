import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DataRightsService } from './data-rights.service';
import {
  AccessRequestDto,
  ErasureRequestDto,
  CorrectionRequestDto,
  PortabilityRequestDto,
  GrievanceDto,
} from './dto';

@ApiTags('Data Rights')
@Controller('data-rights')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class DataRightsController {
  constructor(private readonly dataRightsService: DataRightsService) {}

  // ===========================
  // Access Requests
  // ===========================

  @Post('access')
  @ApiOperation({
    summary: 'Submit data access request',
    description: 'Request access to your personal data (Right to Access - DPDP Act Section 11)',
  })
  @ApiResponse({ status: 201, description: 'Access request submitted' })
  async submitAccessRequest(
    @CurrentUser() user: any,
    @Body() dto: AccessRequestDto,
  ) {
    const request = await this.dataRightsService.submitAccessRequest(user.id, {
      categories: dto.categories,
      reason: dto.reason,
    });

    return {
      success: true,
      message: 'Access request submitted successfully',
      data: {
        requestId: request.id,
        status: request.status,
        responseDeadline: request.responseDeadline,
      },
    };
  }

  // ===========================
  // Erasure Requests
  // ===========================

  @Post('erasure')
  @ApiOperation({
    summary: 'Submit erasure request',
    description: 'Request deletion of your personal data (Right to Erasure - DPDP Act Section 12)',
  })
  @ApiResponse({ status: 201, description: 'Erasure request submitted' })
  async submitErasureRequest(
    @CurrentUser() user: any,
    @Body() dto: ErasureRequestDto,
  ) {
    const request = await this.dataRightsService.submitErasureRequest(user.id, {
      scope: dto.scope,
      categories: dto.categories,
      reason: dto.reason,
    });

    return {
      success: true,
      message: 'Erasure request submitted successfully',
      data: {
        requestId: request.id,
        status: request.status,
        responseDeadline: request.responseDeadline,
      },
    };
  }

  // ===========================
  // Correction Requests
  // ===========================

  @Post('correction')
  @ApiOperation({
    summary: 'Submit correction request',
    description: 'Request correction of inaccurate personal data (Right to Correction - DPDP Act Section 12)',
  })
  @ApiResponse({ status: 201, description: 'Correction request submitted' })
  async submitCorrectionRequest(
    @CurrentUser() user: any,
    @Body() dto: CorrectionRequestDto,
  ) {
    const request = await this.dataRightsService.submitCorrectionRequest(user.id, {
      field: dto.field,
      currentValue: dto.currentValue,
      correctedValue: dto.correctedValue,
      reason: dto.reason,
      evidence: dto.evidence,
    });

    return {
      success: true,
      message: 'Correction request submitted successfully',
      data: {
        requestId: request.id,
        status: request.status,
        responseDeadline: request.responseDeadline,
      },
    };
  }

  // ===========================
  // Portability Requests
  // ===========================

  @Post('portability')
  @ApiOperation({
    summary: 'Submit data portability request',
    description: 'Request export of your personal data in a portable format',
  })
  @ApiResponse({ status: 201, description: 'Portability request submitted' })
  async submitPortabilityRequest(
    @CurrentUser() user: any,
    @Body() dto: PortabilityRequestDto,
  ) {
    const request = await this.dataRightsService.submitPortabilityRequest(user.id, {
      format: dto.format,
      categories: dto.categories,
    });

    return {
      success: true,
      message: 'Portability request submitted successfully',
      data: {
        requestId: request.id,
        status: request.status,
        responseDeadline: request.responseDeadline,
      },
    };
  }

  // ===========================
  // Grievance
  // ===========================

  @Post('grievance')
  @ApiOperation({
    summary: 'Submit grievance',
    description: 'Submit a grievance about data handling (Grievance Redressal - DPDP Act Section 13)',
  })
  @ApiResponse({ status: 201, description: 'Grievance submitted' })
  async submitGrievance(
    @CurrentUser() user: any,
    @Body() dto: GrievanceDto,
  ) {
    const result = await this.dataRightsService.submitGrievance(user.id, {
      category: dto.category,
      description: dto.description,
      relatedRequestId: dto.relatedRequestId,
    });

    return {
      success: true,
      message: 'Grievance submitted successfully',
      data: result,
    };
  }

  // ===========================
  // Query Requests
  // ===========================

  @Get('requests')
  @ApiOperation({
    summary: 'Get all requests',
    description: 'Get all data rights requests for current user',
  })
  @ApiResponse({ status: 200, description: 'List of requests' })
  async getMyRequests(@CurrentUser() user: any) {
    const requests = await this.dataRightsService.getUserRequests(user.id);

    return {
      success: true,
      data: requests,
      count: requests.length,
    };
  }

  @Get('requests/:id')
  @ApiOperation({
    summary: 'Get request by ID',
    description: 'Get details of a specific data rights request',
  })
  @ApiParam({ name: 'id', description: 'Request ID' })
  @ApiResponse({ status: 200, description: 'Request details' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async getRequest(@Param('id') requestId: string) {
    const request = await this.dataRightsService.getRequestById(requestId);

    if (!request) {
      return {
        success: false,
        message: 'Request not found',
      };
    }

    return {
      success: true,
      data: request,
    };
  }

  @Get('export/:id')
  @ApiOperation({
    summary: 'Download data export',
    description: 'Download the data export for a completed portability request',
  })
  @ApiParam({ name: 'id', description: 'Request ID' })
  @ApiResponse({ status: 200, description: 'Data export file' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async downloadExport(
    @Param('id') requestId: string,
    @Res() res: Response,
  ) {
    const { data, format, filename } = await this.dataRightsService.generatePortableExport(requestId);

    const contentType = format === 'json'
      ? 'application/json'
      : format === 'csv'
        ? 'text/csv'
        : 'application/xml';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  }
}
