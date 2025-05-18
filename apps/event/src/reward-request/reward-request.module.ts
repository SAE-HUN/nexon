import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RewardRequestController } from './reward-request.controller';
import { RewardRequestService } from './reward-request.service';
import { RewardRequestRepository } from './reward-request.repository';
import { RewardRequest, RewardRequestSchema } from './schema/reward-request.schema';
import { EventRewardModule } from '../event-reward/event-reward.module';
import { EventRewardSchema } from '../event-reward/schema/event-reward.schema';
import { EventReward } from '../event-reward/schema/event-reward.schema';
import { EventRewardRepository } from '../event-reward/event-reward.repository';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RewardRequest.name, schema: RewardRequestSchema },
      { name: EventReward.name, schema: EventRewardSchema },
    ]),
    EventRewardModule,
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
  controllers: [RewardRequestController],
  providers: [RewardRequestService, RewardRequestRepository, EventRewardRepository],
  exports: [RewardRequestService, RewardRequestRepository],
})
export class RewardRequestModule {} 