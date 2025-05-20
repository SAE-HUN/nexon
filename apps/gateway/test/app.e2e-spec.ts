import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import { of } from 'rxjs';
import * as request from 'supertest';
import { GatewayModule } from './../src/gateway.module';

describe('Gateway', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let operatorToken: string;
  let auditorToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [GatewayModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    const authClient = app.get<ClientProxy>('AUTH_SERVICE');
    const eventClient = app.get<ClientProxy>('EVENT_SERVICE');
    jest.spyOn(authClient, 'send').mockImplementation(() => of({ data: 'ok' }));
    jest
      .spyOn(eventClient, 'send')
      .mockImplementation(() => of({ data: 'ok' }));

    const configService = app.get(ConfigService);
    adminToken = jwt.sign(
      { sub: 1, username: 'admin', role: 'ADMIN' },
      configService.get<string>('JWT_SECRET', 'TEMP_SECRET'),
    );
    userToken = jwt.sign(
      { sub: 2, username: 'user', role: 'USER' },
      configService.get<string>('JWT_SECRET', 'TEMP_SECRET'),
    );
    operatorToken = jwt.sign(
      { sub: 3, username: 'operator', role: 'OPERATOR' },
      configService.get<string>('JWT_SECRET', 'TEMP_SECRET'),
    );
    auditorToken = jwt.sign(
      { sub: 4, username: 'auditor', role: 'AUDITOR' },
      configService.get<string>('JWT_SECRET', 'TEMP_SECRET'),
    );
    await app.init();
  });

  it('GET / should return 200 without token', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  describe('Auth', () => {
    describe('PATCH /auth/change-role', () => {
      it('should return 401 if no token is provided', () => {
        return request(app.getHttpServer())
          .patch('/auth/change-role')
          .send({ userId: 2, role: 'OPERATOR' })
          .expect(401);
      });
      it('should return 403 if USER token is provided', () => {
        return request(app.getHttpServer())
          .patch('/auth/change-role')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ userId: 2, role: 'OPERATOR' })
          .expect(403);
      });
      it('should return 403 if OPERATOR token is provided', () => {
        return request(app.getHttpServer())
          .patch('/auth/change-role')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({ userId: 2, role: 'OPERATOR' })
          .expect(403);
      });
      it('should return 403 if AUDITOR token is provided', () => {
        return request(app.getHttpServer())
          .patch('/auth/change-role')
          .set('Authorization', `Bearer ${auditorToken}`)
          .send({ userId: 2, role: 'OPERATOR' })
          .expect(403);
      });
      it('should return 200 if ADMIN token is provided', () => {
        return request(app.getHttpServer())
          .patch('/auth/change-role')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ userId: 2, role: 'OPERATOR' })
          .expect(200);
      });
    });

    it('GET /auth/hello should return 200 without token', () => {
      return request(app.getHttpServer()).get('/auth/hello').expect(200);
    });
    it('POST /auth/signup should return 201 without token', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({ username: 'test', password: 'test' })
        .expect(201);
    });
    it('POST /auth/login should return 201 without token', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'test', password: 'test' })
        .expect(201);
    });
  });

  describe('Event', () => {
    it('GET /event/hello should return 200 without token', () => {
      return request(app.getHttpServer()).get('/event/hello').expect(200);
    });
    describe('POST /event', () => {
      it('should return 401 if no token is provided', () => {
        return request(app.getHttpServer())
          .post('/event')
          .send({ title: 'test', condition: {}, duration: 1 })
          .expect(401);
      });
      it('should return 403 if USER token is provided', () => {
        return request(app.getHttpServer())
          .post('/event')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ title: 'test', condition: {}, duration: 1 })
          .expect(403);
      });
      it('should return 403 if AUDITOR token is provided', () => {
        return request(app.getHttpServer())
          .post('/event')
          .set('Authorization', `Bearer ${auditorToken}`)
          .send({ title: 'test', condition: {}, duration: 1 })
          .expect(403);
      });
      it('should return 201 if ADMIN token is provided', () => {
        return request(app.getHttpServer())
          .post('/event')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ title: 'test', condition: {}, duration: 1 })
          .expect(201);
      });
      it('should return 201 if OPERATOR token is provided', () => {
        return request(app.getHttpServer())
          .post('/event')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({ title: 'test', condition: {}, duration: 1 })
          .expect(201);
      });
    });

    describe('GET /event', () => {
      it('should return 401 if no token is provided', () => {
        return request(app.getHttpServer()).get('/event').expect(401);
      });
      it('should return 200 if USER token is provided', () => {
        return request(app.getHttpServer())
          .get('/event')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);
      });
      it('should return 200 if ADMIN token is provided', () => {
        return request(app.getHttpServer())
          .get('/event')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });
      it('should return 200 if OPERATOR token is provided', () => {
        return request(app.getHttpServer())
          .get('/event')
          .set('Authorization', `Bearer ${operatorToken}`)
          .expect(200);
      });
      it('should return 200 if AUDITOR token is provided', () => {
        return request(app.getHttpServer())
          .get('/event')
          .set('Authorization', `Bearer ${auditorToken}`)
          .expect(200);
      });
    });

    describe('POST /reward', () => {
      it('should return 401 if no token is provided', () => {
        return request(app.getHttpServer())
          .post('/reward')
          .send({ name: 'reward', type: 'point', value: 100 })
          .expect(401);
      });
      it('should return 403 if USER token is provided', () => {
        return request(app.getHttpServer())
          .post('/reward')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ name: 'reward', type: 'point', value: 100 })
          .expect(403);
      });
      it('should return 403 if AUDITOR token is provided', () => {
        return request(app.getHttpServer())
          .post('/reward')
          .set('Authorization', `Bearer ${auditorToken}`)
          .send({ name: 'reward', type: 'point', value: 100 })
          .expect(403);
      });
      it('should return 201 if ADMIN token is provided', () => {
        return request(app.getHttpServer())
          .post('/reward')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'reward', type: 'point', value: 100 })
          .expect(201);
      });
      it('should return 201 if OPERATOR token is provided', () => {
        return request(app.getHttpServer())
          .post('/reward')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({ name: 'reward', type: 'point', value: 100 })
          .expect(201);
      });
    });

    describe('GET /reward', () => {
      it('should return 401 if no token is provided', () => {
        return request(app.getHttpServer()).get('/reward').expect(401);
      });
      it('should return 200 if USER token is provided', () => {
        return request(app.getHttpServer())
          .get('/reward')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);
      });
      it('should return 200 if ADMIN token is provided', () => {
        return request(app.getHttpServer())
          .get('/reward')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });
      it('should return 200 if OPERATOR token is provided', () => {
        return request(app.getHttpServer())
          .get('/reward')
          .set('Authorization', `Bearer ${operatorToken}`)
          .expect(200);
      });
      it('should return 200 if AUDITOR token is provided', () => {
        return request(app.getHttpServer())
          .get('/reward')
          .set('Authorization', `Bearer ${auditorToken}`)
          .expect(200);
      });
    });

    describe('POST /event-reward', () => {
      it('should return 401 if no token is provided', () => {
        return request(app.getHttpServer())
          .post('/event-reward')
          .send({ eventId: '1', rewardId: '1' })
          .expect(401);
      });
      it('should return 403 if USER token is provided', () => {
        return request(app.getHttpServer())
          .post('/event-reward')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ eventId: '1', rewardId: '1' })
          .expect(403);
      });
      it('should return 403 if AUDITOR token is provided', () => {
        return request(app.getHttpServer())
          .post('/event-reward')
          .set('Authorization', `Bearer ${auditorToken}`)
          .send({ eventId: '1', rewardId: '1' })
          .expect(403);
      });
      it('should return 201 if ADMIN token is provided', () => {
        return request(app.getHttpServer())
          .post('/event-reward')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ eventId: '1', rewardId: '1' })
          .expect(201);
      });
      it('should return 201 if OPERATOR token is provided', () => {
        return request(app.getHttpServer())
          .post('/event-reward')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({ eventId: '1', rewardId: '1' })
          .expect(201);
      });
    });

    describe('GET /event-reward', () => {
      it('should return 401 if no token is provided', () => {
        return request(app.getHttpServer()).get('/event-reward').expect(401);
      });
      it('should return 200 if USER token is provided', () => {
        return request(app.getHttpServer())
          .get('/event-reward')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);
      });
      it('should return 200 if ADMIN token is provided', () => {
        return request(app.getHttpServer())
          .get('/event-reward')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });
      it('should return 200 if OPERATOR token is provided', () => {
        return request(app.getHttpServer())
          .get('/event-reward')
          .set('Authorization', `Bearer ${operatorToken}`)
          .expect(200);
      });
      it('should return 200 if AUDITOR token is provided', () => {
        return request(app.getHttpServer())
          .get('/event-reward')
          .set('Authorization', `Bearer ${auditorToken}`)
          .expect(200);
      });
    });

    describe('POST /reward-request', () => {
      it('should return 401 if no token is provided', () => {
        return request(app.getHttpServer())
          .post('/reward-request')
          .send({ eventId: '1', rewardId: '1' })
          .expect(401);
      });
      it('should return 201 if USER token is provided', () => {
        return request(app.getHttpServer())
          .post('/reward-request')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ eventId: '1', rewardId: '1' })
          .expect(201);
      });
      it('should return 201 if ADMIN token is provided', () => {
        return request(app.getHttpServer())
          .post('/reward-request')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ eventId: '1', rewardId: '1' })
          .expect(201);
      });
      it('should return 201 if OPERATOR token is provided', () => {
        return request(app.getHttpServer())
          .post('/reward-request')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({ eventId: '1', rewardId: '1' })
          .expect(201);
      });
      it('should return 201 if AUDITOR token is provided', () => {
        return request(app.getHttpServer())
          .post('/reward-request')
          .set('Authorization', `Bearer ${auditorToken}`)
          .send({ eventId: '1', rewardId: '1' })
          .expect(201);
      });
    });

    describe('GET /reward-request', () => {
      it('should return 401 if no token is provided', () => {
        return request(app.getHttpServer()).get('/reward-request').expect(401);
      });
      it('should return 200 if ADMIN token is provided', () => {
        return request(app.getHttpServer())
          .get('/reward-request')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });
      it('should return 200 if AUDITOR token is provided', () => {
        return request(app.getHttpServer())
          .get('/reward-request')
          .set('Authorization', `Bearer ${auditorToken}`)
          .expect(200);
      });
      it('should return 403 if USER token is provided', () => {
        return request(app.getHttpServer())
          .get('/reward-request')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });
      it('should return 403 if OPERATOR token is provided', () => {
        return request(app.getHttpServer())
          .get('/reward-request')
          .set('Authorization', `Bearer ${operatorToken}`)
          .expect(403);
      });
    });

    describe('GET /reward-request/my', () => {
      it('should return 401 if no token is provided', () => {
        return request(app.getHttpServer())
          .get('/reward-request/my')
          .expect(401);
      });
      it('should return 200 if USER token is provided', () => {
        return request(app.getHttpServer())
          .get('/reward-request/my')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);
      });
      it('should return 200 if ADMIN token is provided', () => {
        return request(app.getHttpServer())
          .get('/reward-request/my')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });
      it('should return 200 if OPERATOR token is provided', () => {
        return request(app.getHttpServer())
          .get('/reward-request/my')
          .set('Authorization', `Bearer ${operatorToken}`)
          .expect(200);
      });
      it('should return 200 if AUDITOR token is provided', () => {
        return request(app.getHttpServer())
          .get('/reward-request/my')
          .set('Authorization', `Bearer ${auditorToken}`)
          .expect(200);
      });
    });

    describe('POST /user-action', () => {
      it('should return 401 if no token is provided', () => {
        return request(app.getHttpServer())
          .post('/user-action')
          .send({ userId: '1', action: 'login' })
          .expect(401);
      });
      it('should return 403 if USER token is provided', () => {
        return request(app.getHttpServer())
          .post('/user-action')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ userId: '1', action: 'login' })
          .expect(403);
      });
      it('should return 403 if AUDITOR token is provided', () => {
        return request(app.getHttpServer())
          .post('/user-action')
          .set('Authorization', `Bearer ${auditorToken}`)
          .send({ userId: '1', action: 'login' })
          .expect(403);
      });
      it('should return 201 if ADMIN token is provided', () => {
        return request(app.getHttpServer())
          .post('/user-action')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ userId: '1', action: 'login' })
          .expect(201);
      });
      it('should return 201 if OPERATOR token is provided', () => {
        return request(app.getHttpServer())
          .post('/user-action')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({ userId: '1', action: 'login' })
          .expect(201);
      });
    });

    describe('GET /user-action', () => {
      it('should return 401 if no token is provided', () => {
        return request(app.getHttpServer()).get('/user-action').expect(401);
      });
      it('should return 403 if USER token is provided', () => {
        return request(app.getHttpServer())
          .get('/user-action')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });
      it('should return 403 if AUDITOR token is provided', () => {
        return request(app.getHttpServer())
          .get('/user-action')
          .set('Authorization', `Bearer ${auditorToken}`)
          .expect(403);
      });
      it('should return 200 if ADMIN token is provided', () => {
        return request(app.getHttpServer())
          .get('/user-action')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });
      it('should return 200 if OPERATOR token is provided', () => {
        return request(app.getHttpServer())
          .get('/user-action')
          .set('Authorization', `Bearer ${operatorToken}`)
          .expect(200);
      });
    });

    describe('PATCH /reward-request/:rewardRequestId/reject', () => {
      const url = '/reward-request/1/reject';
      it('should return 401 if no token is provided', () => {
        return request(app.getHttpServer())
          .patch(url)
          .send({ reason: 'not eligible' })
          .expect(401);
      });
      it('should return 403 if USER token is provided', () => {
        return request(app.getHttpServer())
          .patch(url)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ reason: 'not eligible' })
          .expect(403);
      });
      it('should return 403 if OPERATOR token is provided', () => {
        return request(app.getHttpServer())
          .patch(url)
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({ reason: 'not eligible' })
          .expect(403);
      });
      it('should return 200 if ADMIN token is provided', () => {
        return request(app.getHttpServer())
          .patch(url)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ reason: 'not eligible' })
          .expect(200);
      });
      it('should return 200 if AUDITOR token is provided', () => {
        return request(app.getHttpServer())
          .patch(url)
          .set('Authorization', `Bearer ${auditorToken}`)
          .send({ reason: 'not eligible' })
          .expect(200);
      });
    });

    describe('PATCH /reward-request/:rewardRequestId/approve', () => {
      const url = '/reward-request/1/approve';
      it('should return 401 if no token is provided', () => {
        return request(app.getHttpServer()).patch(url).expect(401);
      });
      it('should return 403 if USER token is provided', () => {
        return request(app.getHttpServer())
          .patch(url)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });
      it('should return 403 if OPERATOR token is provided', () => {
        return request(app.getHttpServer())
          .patch(url)
          .set('Authorization', `Bearer ${operatorToken}`)
          .expect(403);
      });
      it('should return 200 if ADMIN token is provided', () => {
        return request(app.getHttpServer())
          .patch(url)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });
      it('should return 200 if AUDITOR token is provided', () => {
        return request(app.getHttpServer())
          .patch(url)
          .set('Authorization', `Bearer ${auditorToken}`)
          .expect(200);
      });
    });
  });
});
