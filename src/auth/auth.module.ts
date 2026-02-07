import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SsoController } from './sso.controller';
import { SsoService } from './sso.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OidcStrategy } from './strategies/oidc.strategy';
import { SamlStrategy } from './strategies/saml.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>(
          'jwt.secret',
          'change-me-in-production',
        ),
        signOptions: {
          expiresIn: `${configService.get<number>('jwt.expiration', 3600)}s`,
        },
      }),
    }),
  ],
  controllers: [AuthController, SsoController],
  providers: [
    AuthService,
    SsoService,
    JwtStrategy,
    OidcStrategy,
    SamlStrategy,
  ],
  exports: [AuthService, SsoService, JwtModule],
})
export class AuthModule {}
