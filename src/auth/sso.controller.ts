import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Response,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { SsoService, SsoUserPayload } from './sso.service';

@ApiTags('auth')
@Controller('auth')
export class SsoController {
  private readonly logger = new Logger(SsoController.name);

  constructor(
    private readonly ssoService: SsoService,
    private readonly configService: ConfigService,
  ) {}

  // ─── OIDC ──────────────────────────────────────────────────────────

  @Get('oidc')
  @ApiOperation({ summary: 'Initiate OIDC SSO login' })
  @UseGuards(AuthGuard('oidc'))
  oidcLogin() {
    // Passport redirects to IdP
  }

  @Get('oidc/callback')
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard('oidc'))
  async oidcCallback(@Request() req: any, @Response() res: any) {
    return this.handleSsoCallback(req, res);
  }

  // ─── SAML ──────────────────────────────────────────────────────────

  @Get('saml')
  @ApiOperation({ summary: 'Initiate SAML SSO login' })
  @UseGuards(AuthGuard('saml'))
  samlLogin() {
    // Passport redirects to IdP
  }

  @Post('saml/callback')
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard('saml'))
  async samlCallback(@Request() req: any, @Response() res: any) {
    return this.handleSsoCallback(req, res);
  }

  // ─── SSO status ────────────────────────────────────────────────────

  @Get('sso/status')
  @ApiOperation({ summary: 'Check which SSO providers are enabled' })
  getSsoStatus() {
    return {
      oidc: {
        enabled: this.configService.get<boolean>('oidc.enabled', false),
        loginUrl: '/auth/oidc',
      },
      saml: {
        enabled: this.configService.get<boolean>('saml.enabled', false),
        loginUrl: '/auth/saml',
      },
    };
  }

  // ─── Shared callback handler ───────────────────────────────────────

  private async handleSsoCallback(req: any, res: any) {
    try {
      const ssoUser = req.user as SsoUserPayload;
      const result = await this.ssoService.handleSsoLogin(ssoUser);

      // Redirect to frontend with token
      const frontendUrl =
        this.configService.get<string>('frontendUrl') ||
        'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${result.accessToken}`;
      return res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('SSO callback failed', error);
      const frontendUrl =
        this.configService.get<string>('frontendUrl') ||
        'http://localhost:3000';
      return res.redirect(`${frontendUrl}/auth/error?message=sso_failed`);
    }
  }
}
