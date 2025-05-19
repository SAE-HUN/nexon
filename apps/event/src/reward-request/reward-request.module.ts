import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventRewardModule } from '../event-reward/event-reward.module';
import { EventRewardRepository } from '../event-reward/event-reward.repository';
import {
  EventReward,
  EventRewardSchema,
} from '../event-reward/schema/event-reward.schema';
import { EventModule } from '../event/event.module';
import { EventService } from '../event/event.service';
import { SharedModule } from '../shared/shared.module';
import { RewardRequestController } from './reward-request.controller';
import { RewardRequestRepository } from './reward-request.repository';
import { RewardRequestService } from './reward-request.service';
import {
  RewardRequest,
  RewardRequestSchema,
} from './schema/reward-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RewardRequest.name, schema: RewardRequestSchema },
      { name: EventReward.name, schema: EventRewardSchema },
    ]),
    EventRewardModule,
    EventModule,
    SharedModule,
  ],
  controllers: [RewardRequestController],
  providers: [
    RewardRequestService,
    RewardRequestRepository,
    EventRewardRepository,
    EventService,
  ],
  exports: [RewardRequestService, RewardRequestRepository],
})
export class RewardRequestModule {}
