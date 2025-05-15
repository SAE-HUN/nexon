import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { GatewayModule } from './../src/gateway.module';
import * as jwt from 'jsonwebtoken';

/**
 * End-to-end tests for GatewayController role-based access control
 */
describe('GatewayController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [GatewayModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  /**
   * Should return 403 Forbidden when accessing protected route without authentication
   * Given: No JWT token
   * When: GET / is called
   * Then: 403 Forbidden is returned
   */
  it('should return 403 when accessing / without authentication', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(403);
  });

  /**
   * Should return 403 Forbidden when accessing protected route with USER role
   * Given: JWT token with USER role
   * When: GET / is called
   * Then: 403 Forbidden is returned
   */
  it('should return 403 when accessing / with USER role', () => {
    const token = jwt.sign({ sub: 1, username: 'user', role: 'USER' }, 'TEMP_SECRET');
    return request(app.getHttpServer())
      .get('/')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});
