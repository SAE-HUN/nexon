import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { GatewayModule } from './../src/gateway.module';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

/**
 * End-to-end tests for GatewayController role-based access control
 */
describe('GatewayController (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [GatewayModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    const configService = app.get(ConfigService);
    adminToken = jwt.sign({ sub: 1, username: 'admin', role: 'ADMIN' }, configService.get<string>('JWT_SECRET', 'TEMP_SECRET'));
    userToken = jwt.sign({ sub: 2, username: 'user', role: 'USER' }, configService.get<string>('JWT_SECRET', 'TEMP_SECRET'));
    await app.init();
  });

  /**
   * Health check endpoint
   */
  it('should return 200 for /health', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect('OK');
  });

  /**
   * ADMIN role can access protected route
   */
  it('should return 200 when accessing / with ADMIN role', () => {
    return request(app.getHttpServer())
      .get('/')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect('Hello World!');
  });

  /**
   * Should return 401 Unauthorized when accessing protected route without authentication
   */
  it('should return 401 when accessing / without authentication', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(401);
  });

  /**
   * Should return 403 Forbidden when accessing protected route with USER role
   */
  it('should return 403 when accessing / with USER role', () => {
    return request(app.getHttpServer())
      .get('/')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });
});
