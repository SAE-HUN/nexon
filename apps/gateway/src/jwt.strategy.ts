import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * Passport strategy class for JWT authentication
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'TEMP_SECRET'),
    });
  }

  /**
   * Validates and returns the JWT payload
   * @param payload JWT payload
   */
  async validate(payload: any): Promise<any> {
    return { userId: payload.sub, username: payload.email, role: payload.role };
  }
}
