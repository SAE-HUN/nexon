import { NestFactory } from '@nestjs/core';
import { GameModule } from './game.module';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const microservice = await NestFactory.createMicroservice(GameModule, {
    transport: Transport.TCP,
    options: {
      host: process.env.GAME_HOST || '127.0.0.1',
      port: Number(process.env.GAME_PORT) || 4003,
    },
  });
  await microservice.listen();
}
bootstrap();
