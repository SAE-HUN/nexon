import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventRewardController } from './event-reward.controller';
import { EventRewardService } from './event-reward.service';
import { EventRewardRepository } from './event-reward.repository';
import { EventReward, EventRewardSchema } from './schema/event-reward.schema';
import { RewardRepository } from '../reward/reward.repository';
import { EventModule } from '../event/event.module';
import { RewardModule } from '../reward/reward.module';
import { EventRepository } from '../event/event.repository';
import { Event, EventSchema } from '../event/schema/event.schema';
import { Reward, RewardSchema } from '../reward/schema/reward.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EventReward.name, schema: EventRewardSchema },
      { name: Event.name, schema: EventSchema },
      { name: Reward.name, schema: RewardSchema },
    ]),
    EventModule,
    RewardModule,
  ],
  controllers: [EventRewardController],
  providers: [
    EventRewardService,
    EventRewardRepository,
    EventRepository,
    RewardRepository,
  ],
  exports: [EventRewardService, EventRewardRepository],
})
export class EventRewardModule {}
