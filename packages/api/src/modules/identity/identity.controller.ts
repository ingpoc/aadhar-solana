import { Controller, Get, Post, Put, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IdentityService } from './identity.service';
import { CreateIdentityDto, UpdateIdentityDto } from './identity.dto';

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
  async prepareTransaction(@Body() createIdentityDto: CreateIdentityDto) {
    return this.identityService.prepareCreateIdentityTransaction(createIdentityDto);
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
}
