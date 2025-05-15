import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuthModule } from './../src/auth.module';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../src/user.schema';
import mongoose from 'mongoose';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let userModel: any;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    userModel = moduleFixture.get(getModelToken(User.name));
    await userModel.deleteMany({});
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await mongoose.disconnect();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/auth')
      .expect(200)
      .expect('Hello World!');
  });

  it('POST /auth/signup - success', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'test1@example.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('test1@example.com');
    expect(res.body.password).toBeDefined();
    expect(res.body.password).not.toBe('password123');
    expect(res.body.role).toBe('USER');
  });

  it('POST /auth/signup - duplicate email', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'test2@example.com', password: 'password123' });
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'test2@example.com', password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('POST /auth/signup - invalid email', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'not-an-email', password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('POST /auth/signup - short password', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'test3@example.com', password: '123' });
    expect(res.status).toBe(400);
  });

  it('POST /auth/login - success', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'loginuser@example.com', password: 'password123' });
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'loginuser@example.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.access_token).toBeDefined();
  });

  it('POST /auth/login - wrong password', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'wrongpw@example.com', password: 'password123' });
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'wrongpw@example.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('POST /auth/login - non-existent email', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'notfound@example.com', password: 'password123' });
    expect(res.status).toBe(401);
  });
});
