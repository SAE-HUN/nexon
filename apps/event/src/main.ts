import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  MicroserviceOptions,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import { RpcExceptionFilter } from '../../common/rpc-exception.filter';
import { EventModule } from './event.module';

async function bootstrap() {
  const microservice =
    await NestFactory.createMicroservice<MicroserviceOptions>(EventModule, {
      transport: Transport.TCP,
      options: {
        host: process.env.EVENT_HOST ?? '127.0.0.1',
        port: parseInt(process.env.EVENT_PORT ?? '4002', 10),
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
