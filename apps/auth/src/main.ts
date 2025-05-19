import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { RpcExceptionFilter } from '../../common/rpc-exception.filter';

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
