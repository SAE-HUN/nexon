import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RewardRequestController } from './reward-request.controller';
import { RewardRequestService } from './reward-request.service';
import { RewardRequestRepository } from './reward-request.repository';
import {
  RewardRequest,
  RewardRequestSchema,
} from './schema/reward-request.schema';
import { EventRewardModule } from '../event-reward/event-reward.module';
import { EventRewardSchema } from '../event-reward/schema/event-reward.schema';
import { EventReward } from '../event-reward/schema/event-reward.schema';
import { EventRewardRepository } from '../event-reward/event-reward.repository';
import { SharedModule } from '../shared/shared.module';
import { EventService } from '../event/event.service';
import { EventModule } from '../event/event.module';

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
