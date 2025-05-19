import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import * as request from 'supertest';
import { GatewayModule } from './../src/gateway.module';

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
    adminToken = jwt.sign(
      { sub: 1, username: 'admin', role: 'ADMIN' },
      configService.get<string>('JWT_SECRET', 'TEMP_SECRET'),
    );
    userToken = jwt.sign(
      { sub: 2, username: 'user', role: 'USER' },
      configService.get<string>('JWT_SECRET', 'TEMP_SECRET'),
    );
    await app.init();
  });

  /**
   * Health check endpoint
   */
  it('should return 200 for /', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
