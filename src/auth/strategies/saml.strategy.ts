import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as PassportSamlStrategy } from 'passport-openidconnect';

/**
 * SAML SSO strategy.
 *
 * This uses a lightweight adapter pattern: the actual SAML library
 * (e.g. `@node-saml/passport-saml`) can be swapped in at deployment time.
 * The strategy reads IdP metadata from config and maps SAML assertions
 * to internal user objects with role/group claims.
 *
 * For production, replace `passport-openidconnect` with `@node-saml/passport-saml`
 * and update the super() constructor accordingly.
 */

export interface SamlProfile {
  nameID: string;
  nameIDFormat?: string;
  [key: string]: unknown;
}

@Injectable()
export class SamlStrategy extends PassportStrategy(PassportSamlStrategy, 'saml') {
  private readonly logger = new Logger(SamlStrategy.name);

  constructor(private readonly configService: ConfigService) {
    const entryPoint = configService.get<string>('saml.entryPoint', '');
    super({
      issuer: configService.get<string>('saml.issuer', 'audit-assistant'),
      authorizationURL: entryPoint,
      tokenURL: entryPoint,
      userInfoURL: entryPoint,
      clientID: configService.get<string>('saml.issuer', 'audit-assistant'),
      clientSecret: 'saml-placeholder',
      callbackURL: configService.get<string>('saml.callbackUrl', ''),
      scope: ['openid'],
    });
  }

  validate(
    _issuer: string,
    profile: SamlProfile,
    done: (err: Error | null, user?: Record<string, unknown>) => void,
  ): void {
    const roleAttr = this.configService.get<string>(
      'saml.roleAttribute',
      'Role',
    );
    const groupAttr = this.configService.get<string>(
      'saml.groupAttribute',
      'Group',
    );

    const rawRole = profile[roleAttr];
    const rawGroup = profile[groupAttr];

    const roles = Array.isArray(rawRole)
      ? rawRole
      : rawRole
        ? [String(rawRole)]
        : [];
    const groups = Array.isArray(rawGroup)
      ? rawGroup
      : rawGroup
        ? [String(rawGroup)]
        : [];

    const user = {
      externalId: profile.nameID || String(profile.id || ''),
      displayName: String(profile.displayName || profile.nameID || ''),
      email: String(
        profile.email || profile.nameID || '',
      ),
      roles,
      groups,
      provider: 'saml',
    };

    this.logger.log(`SAML login: ${user.email} (roles=${roles}, groups=${groups})`);
    done(null, user);
  }
}
