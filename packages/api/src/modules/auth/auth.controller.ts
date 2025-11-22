import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser } from './auth.service';

class WalletAuthDto {
  solanaPublicKey: string;
  signature: string;
  message: string;
}

class RefreshTokenDto {
  refreshToken: string;
}

class CreateApiKeyDto {
  name: string;
  permissions?: string[];
  expiresInDays?: number;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('nonce')
  @ApiOperation({ summary: 'Get authentication nonce for wallet signing' })
  @ApiResponse({ status: 200, description: 'Returns nonce and message for wallet signing' })
  getNonce() {
    return this.authService.generateAuthNonce();
  }

  @Post('wallet')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with Solana wallet signature' })
  @ApiBody({ type: WalletAuthDto })
  @ApiResponse({ status: 200, description: 'Returns JWT tokens' })
  async authenticateWallet(
    @Body() dto: WalletAuthDto,
    @Req() req: any,
  ) {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip;

    return this.authService.authenticateWithWallet(
      dto.solanaPublicKey,
      dto.signature,
      dto.message,
      deviceInfo,
      ipAddress,
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Returns new JWT tokens' })
  async refreshTokens(
    @Body() dto: RefreshTokenDto,
    @Req() req: any,
  ) {
    return this.authService.refreshTokens(dto.refreshToken, req.ip);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.revokeRefreshToken(dto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Logout from all devices' })
  async logoutAll(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.revokeAllUserTokens(user.id);
    return { message: 'Logged out from all devices' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns current user info' })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  // ============== API Keys ==============

  @Post('api-keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiBody({ type: CreateApiKeyDto })
  @ApiResponse({ status: 201, description: 'Returns the API key (shown only once)' })
  async createApiKey(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.authService.createApiKey(
      user.id,
      dto.name,
      dto.permissions,
      dto.expiresInDays,
    );
  }

  @Delete('api-keys/:keyId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Revoke an API key' })
  async revokeApiKey(
    @CurrentUser() user: AuthenticatedUser,
    @Param('keyId') keyId: string,
  ) {
    await this.authService.revokeApiKey(keyId, user.id);
  }
}
