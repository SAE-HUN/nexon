import { Module } from '@nestjs/common';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Event, EventSchema } from './schemas/event.schema';
import { Reward, RewardSchema } from './schemas/reward.schema';
import { EventReward, EventRewardSchema } from './schemas/event-reward.schema';
import { RewardRequest, RewardRequestSchema } from './schemas/reward-request.schema';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('EVENT_MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: Reward.name, schema: RewardSchema },
      { name: EventReward.name, schema: EventRewardSchema },
      { name: RewardRequest.name, schema: RewardRequestSchema },
    ]),
    ClientsModule.register([
      {
        name: 'GAME_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.GAME_SERVICE_HOST || 'localhost',
          port: parseInt(process.env.GAME_SERVICE_PORT || '4003', 10),
        },
      },
    ]),
  ],
  controllers: [EventController],
  providers: [EventService],
})
export class EventModule {}
