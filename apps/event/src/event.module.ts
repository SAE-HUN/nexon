import { Module } from '@nestjs/common';
import { EventController } from './event/event.controller';
import { EventService } from './event/event.service';
import { RewardController } from './reward/reward.controller';
import { RewardService } from './reward/reward.service';
import { EventRewardController } from './event-reward/event-reward.controller';
import { EventRewardService } from './event-reward/event-reward.service';
import { RewardRequestController } from './reward-request/reward-request.controller';
import { RewardRequestService } from './reward-request/reward-request.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Event, EventSchema } from './event/schema/event.schema';
import { Reward, RewardSchema } from './reward/schema/reward.schema';
import { EventReward, EventRewardSchema } from './event-reward/schema/event-reward.schema';
import { RewardRequest, RewardRequestSchema } from './reward-request/schema/reward-request.schema';
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
  controllers: [
    EventController,
    RewardController,
    EventRewardController,
    RewardRequestController,
  ],
  providers: [
    EventService,
    RewardService,
    EventRewardService,
    RewardRequestService,
  ],
})
export class EventModule {}
