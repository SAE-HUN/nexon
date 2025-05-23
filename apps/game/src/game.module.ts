import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { GameController } from './game.controller';
import { GameService } from './game.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'EVENT_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.EVENT_HOST || '127.0.0.1',
          port: Number(process.env.EVENT_PORT) || 4002,
        },
      },
    ]),
  ],
  controllers: [GameController],
  providers: [GameService],
})
export class GameModule {}
