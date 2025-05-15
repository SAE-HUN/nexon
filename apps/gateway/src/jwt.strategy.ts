import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * JWT 인증을 위한 Passport 전략 클래스
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
   * JWT payload를 검증하고 반환
   * @param payload JWT payload
   */
  async validate(payload: any): Promise<any> {
    return { userId: payload.sub, username: payload.username, role: payload.role };
  }
} 