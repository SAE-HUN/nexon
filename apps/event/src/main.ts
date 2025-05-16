import { NestFactory } from '@nestjs/core';
import { EventModule } from './event.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

async function bootstrap() {
  const microservice = await NestFactory.createMicroservice<MicroserviceOptions>(EventModule, {
    transport: Transport.TCP,
    options: {
      host: process.env.EVENT_HOST ?? '127.0.0.1',
      port: parseInt(process.env.EVENT_PORT ?? '4002', 10),
    },
  });
  microservice.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    exceptionFactory: (errors) => new RpcException(errors),
  }));
  await microservice.listen();
}
bootstrap();
