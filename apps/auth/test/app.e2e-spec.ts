import { Test, TestingModule } from '@nestjs/testing';
import { INestMicroservice, ValidationPipe } from '@nestjs/common';
import { AuthModule } from './../src/auth.module';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../src/user.schema';
import mongoose from 'mongoose';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { NestFactory } from '@nestjs/core';
import { RpcException } from '@nestjs/microservices';

describe('Auth (microservice e2e)', () => {
  let app: INestMicroservice;
  let client: ClientProxy;
  let userModel: any;

  beforeAll(async () => {
    app = await NestFactory.createMicroservice(AuthModule, {
      transport: Transport.TCP,
      options: {
        host: '127.0.0.1',
        port: 4000,
      },
      logger: false
    });
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => new RpcException(errors),
    }));
    await app.listen();

    client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: '127.0.0.1',
        port: 4000,
      },
    });
    await client.connect();
    userModel = app.get(getModelToken(User.name));
  });

  beforeEach(async () => {
    await userModel.deleteMany({});
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (client) {
      await client.close();
    }
    await mongoose.disconnect();
  });

  it('should sign up a new user', async () => {
    const res = await firstValueFrom(client.send({ cmd: 'auth_signup' }, { email: 'test1@example.com', password: 'password123' }));
    expect(res.email).toBe('test1@example.com');
    expect(res.password).toBeDefined();
    expect(res.password).not.toBe('password123');
    expect(res.role).toBe('USER');
  });

  it('should not sign up with duplicate email', async () => {
    await firstValueFrom(client.send({ cmd: 'auth_signup' }, { email: 'test2@example.com', password: 'password123' }));
    await expect(
      firstValueFrom(client.send({ cmd: 'auth_signup' }, { email: 'test2@example.com', password: 'password123' }))
    ).rejects.toMatchObject({ message: 'Email already exists' });
  });

  it('should not sign up with invalid email', async () => {
    await expect(
      firstValueFrom(client.send({ cmd: 'auth_signup' }, { email: 'not-an-email', password: 'password123' }))
    ).rejects.toEqual(expect.anything());
  });

  it('should not sign up with short password', async () => {
    await expect(
      firstValueFrom(client.send({ cmd: 'auth_signup' }, { email: 'test3@example.com', password: '123' }))
    ).rejects.toEqual(expect.anything());
  });

  it('should login with correct credentials', async () => {
    await firstValueFrom(client.send({ cmd: 'auth_signup' }, { email: 'loginuser@example.com', password: 'password123' }));
    const res = await firstValueFrom(client.send({ cmd: 'auth_login' }, { email: 'loginuser@example.com', password: 'password123' }));
    expect(res.access_token).toBeDefined();
  });

  it('should not login with wrong password', async () => {
    await firstValueFrom(client.send({ cmd: 'auth_signup' }, { email: 'wrongpw@example.com', password: 'password123' }));
    await expect(
      firstValueFrom(client.send({ cmd: 'auth_login' }, { email: 'wrongpw@example.com', password: 'wrongpassword' }))
    ).rejects.toMatchObject({ message: 'Invalid email or password.' });
  });

  it('should not login with non-existent email', async () => {
    await expect(
      firstValueFrom(client.send({ cmd: 'auth_login' }, { email: 'notfound@example.com', password: 'password123' }))
    ).rejects.toMatchObject({ message: 'Invalid email or password.' });
  });

  it('should change user role', async () => {
    const userRes = await firstValueFrom(client.send({ cmd: 'auth_signup' }, { email: 'biztest1@example.com', password: 'password123' }));
    const userId = userRes._id || userRes.id;
    const res = await firstValueFrom(client.send({ cmd: 'auth_change_role' }, { userId, role: 'OPERATOR' }));
    expect(res.role).toBe('OPERATOR');
  });

  it('should return error for non-existent user', async () => {
    const fakeId = '60d21b4667d0d8992e610c85';
    await expect(
      firstValueFrom(client.send({ cmd: 'auth_change_role' }, { userId: fakeId, role: 'OPERATOR' }))
    ).rejects.toMatchObject({ message: '존재하지 않는 유저입니다.' });
  });

  it('should return error for already same role', async () => {
    const userRes = await firstValueFrom(client.send({ cmd: 'auth_signup' }, { email: 'biztest2@example.com', password: 'password123' }));
    const userId = userRes._id || userRes.id;
    await expect(
      firstValueFrom(client.send({ cmd: 'auth_change_role' }, { userId, role: 'USER' }))
    ).rejects.toMatchObject({ message: '이미 해당 role입니다.' });
  });

  it('should return error for invalid role', async () => {
    const userRes = await firstValueFrom(client.send({ cmd: 'auth_signup' }, { email: 'biztest3@example.com', password: 'password123' }));
    const userId = userRes._id || userRes.id;
    await expect(
      firstValueFrom(client.send({ cmd: 'auth_change_role' }, { userId, role: 'NOT_A_ROLE' }))
    ).rejects.toEqual(expect.anything());
  });
});
