import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  MicroserviceOptions,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import { RpcExceptionFilter } from '../../common/rpc-exception.filter';
import { AuthModule } from './auth.module';

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
}
bootstrap();
