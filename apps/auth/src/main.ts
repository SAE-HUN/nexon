import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  MicroserviceOptions,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { RpcExceptionFilter } from '../../common/rpc-exception.filter';
import { AuthModule } from './auth.module';
import { AuthRepository } from './auth.repository';
import { UserRole } from './enum/user-role.enum';

async function createAdminSeedUser() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const app = await NestFactory.createApplicationContext(AuthModule, {
    logger: false,
  });
  const repo = app.get(AuthRepository);
  const exists = await repo.existsByEmail(email);
  if (!exists) {
    const hashed = await bcrypt.hash(password, 10);
    await repo.createUser({ email, password: hashed, role: UserRole.ADMIN });
  }
  await app.close();
}

async function bootstrap() {
  const microservice =
    await NestFactory.createMicroservice<MicroserviceOptions>(AuthModule, {
      transport: Transport.TCP,
      options: {
        host: process.env.AUTH_HOST ?? '127.0.0.1',
        port: parseInt(process.env.AUTH_PORT ?? '4001', 10),
      },
    });
  microservice.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        return new RpcException({ message: errors, status: 400 });
      },
    }),
  );
  microservice.useGlobalFilters(new RpcExceptionFilter());
  await microservice.listen();
  await createAdminSeedUser();
}
bootstrap();
