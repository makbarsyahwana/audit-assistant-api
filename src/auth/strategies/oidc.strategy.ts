import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as OpenIdConnectStrategy } from 'passport-openidconnect';

export interface OidcProfile {
  id: string;
  displayName: string;
  emails?: Array<{ value: string }>;
  _json?: Record<string, unknown>;
}

@Injectable()
export class OidcStrategy extends PassportStrategy(OpenIdConnectStrategy, 'oidc') {
  private readonly logger = new Logger(OidcStrategy.name);

  constructor(private readonly configService: ConfigService) {
    const issuer = configService.get<string>('oidc.issuer', '');
    super({
      issuer,
      authorizationURL: `${issuer}/authorize`,
      tokenURL: `${issuer}/oauth/token`,
      userInfoURL: `${issuer}/userinfo`,
      clientID: configService.get<string>('oidc.clientId', ''),
      clientSecret: configService.get<string>('oidc.clientSecret', ''),
      callbackURL: configService.get<string>('oidc.callbackUrl', ''),
      scope: configService
        .get<string>('oidc.scope', 'openid profile email')
        .split(' '),
    });
  }

  validate(
    _issuer: string,
    profile: OidcProfile,
    done: (err: Error | null, user?: Record<string, unknown>) => void,
  ): void {
    const rolesClaim = this.configService.get<string>(
      'oidc.rolesClaim',
      'roles',
    );
    const groupsClaim = this.configService.get<string>(
      'oidc.groupsClaim',
      'groups',
    );

    const rawJson = profile._json || {};
    const roles = (rawJson[rolesClaim] as string[]) || [];
    const groups = (rawJson[groupsClaim] as string[]) || [];

    const email =
      profile.emails && profile.emails.length > 0
        ? profile.emails[0].value
        : '';

    const user = {
      externalId: profile.id,
      displayName: profile.displayName,
      email,
      roles,
      groups,
      provider: 'oidc',
    };

    this.logger.log(`OIDC login: ${email} (roles=${roles}, groups=${groups})`);
    done(null, user);
  }
}
