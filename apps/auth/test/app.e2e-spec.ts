jest.setTimeout(30000);

import { Test, TestingModule } from '@nestjs/testing';
import { INestMicroservice, ValidationPipe } from '@nestjs/common';
import { AuthModule } from './../src/auth.module';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../src/schema/user.schema';
import { ClientProxy, ClientProxyFactory, RpcException, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { RpcExceptionFilter } from '../../common/rpc-exception.filter';

describe('Auth (microservice e2e)', () => {
  let app: INestMicroservice;
  let client: ClientProxy;
  let userModel: any;
  let replSet: MongoMemoryReplSet;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    process.env.AUTH_MONGODB_URI = uri;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    app = moduleFixture.createNestMicroservice({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: 4000 },
      logger: false,
    });
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => new RpcException(errors),
    }));
    app.useGlobalFilters(new RpcExceptionFilter());
    await app.listen();

    client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: 4000 },
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
    if (replSet) {
      await replSet.stop();
    }
  });

  it('should sign up a new user', async () => {
    const res = await firstValueFrom(client.send({ cmd: 'auth.user.signup' }, { email: 'test1@example.com', password: 'password123' }));
    expect(res.email).toBe('test1@example.com');
    expect(res.password).toBeDefined();
    expect(res.password).not.toBe('password123');
    expect(res.role).toBe('USER');
  });

  it('should not sign up with duplicate email', async () => {
    await firstValueFrom(client.send({ cmd: 'auth.user.signup' }, { email: 'test2@example.com', password: 'password123' }));
    await expect(
      firstValueFrom(client.send({ cmd: 'auth.user.signup' }, { email: 'test2@example.com', password: 'password123' }))
    ).rejects.toMatchObject({ message: 'Email already exists' });
  });

  it('should not sign up with invalid email', async () => {
    await expect(
      firstValueFrom(client.send({ cmd: 'auth.user.signup' }, { email: 'not-an-email', password: 'password123' }))
    ).rejects.toEqual(expect.anything());
  });

  it('should not sign up with short password', async () => {
    await expect(
      firstValueFrom(client.send({ cmd: 'auth.user.signup' }, { email: 'test3@example.com', password: '123' }))
    ).rejects.toEqual(expect.anything());
  });

  it('should login with correct credentials', async () => {
    await firstValueFrom(client.send({ cmd: 'auth.user.signup' }, { email: 'loginuser@example.com', password: 'password123' }));
    const res = await firstValueFrom(client.send({ cmd: 'auth.user.login' }, { email: 'loginuser@example.com', password: 'password123' }));
    expect(res.access_token).toBeDefined();
  });

  it('should not login with wrong password', async () => {
    await firstValueFrom(client.send({ cmd: 'auth.user.signup' }, { email: 'wrongpw@example.com', password: 'password123' }));
    await expect(
      firstValueFrom(client.send({ cmd: 'auth.user.login' }, { email: 'wrongpw@example.com', password: 'wrongpassword' }))
    ).rejects.toMatchObject({ message: 'Invalid email or password.' });
  });

  it('should not login with non-existent email', async () => {
    await expect(
      firstValueFrom(client.send({ cmd: 'auth.user.login' }, { email: 'notfound@example.com', password: 'password123' }))
    ).rejects.toMatchObject({ message: 'Invalid email or password.' });
  });

  it('should change user role', async () => {
    const userRes = await firstValueFrom(client.send({ cmd: 'auth.user.signup' }, { email: 'biztest1@example.com', password: 'password123' }));
    const userId = userRes._id || userRes.id;
    const res = await firstValueFrom(client.send({ cmd: 'auth.user.change-role' }, { userId, role: 'OPERATOR' }));
    expect(res.role).toBe('OPERATOR');
  });

  it('should return error for non-existent user', async () => {
    const fakeId = '60d21b4667d0d8992e610c85';
    await expect(
      firstValueFrom(client.send({ cmd: 'auth.user.change-role' }, { userId: fakeId, role: 'OPERATOR' }))
    ).rejects.toMatchObject({ message: 'User does not exist.' });
  });

  it('should return error for already same role', async () => {
    const userRes = await firstValueFrom(client.send({ cmd: 'auth.user.signup' }, { email: 'biztest2@example.com', password: 'password123' }));
    const userId = userRes._id || userRes.id;
    await expect(
      firstValueFrom(client.send({ cmd: 'auth.user.change-role' }, { userId, role: 'USER' }))
    ).rejects.toMatchObject({ message: 'Already has role.' });
  });

  it('should return error for invalid role', async () => {
    const userRes = await firstValueFrom(client.send({ cmd: 'auth.user.signup' }, { email: 'biztest3@example.com', password: 'password123' }));
    const userId = userRes._id || userRes.id;
    await expect(
      firstValueFrom(client.send({ cmd: 'auth.user.change-role' }, { userId, role: 'NOT_A_ROLE' }))
    ).rejects.toEqual(expect.anything());
  });
});
