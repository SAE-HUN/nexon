import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * JWT 인증을 위한 Passport 전략 클래스
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'TEMP_SECRET', // TODO: 환경변수로 분리
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