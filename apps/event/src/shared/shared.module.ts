import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'GAME_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.GAME_HOST || '127.0.0.1',
          port: parseInt(process.env.GAME_PORT || '4003', 10),
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class SharedModule {}
