import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventModule as EventDomainModule } from './event/event.module';
import { EventRewardModule } from './event-reward/event-reward.module';
import { RewardModule } from './reward/reward.module';
import { RewardRequestModule } from './reward-request/reward-request.module';
import { UserActionModule } from './user-action/user-action.module';

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
    EventDomainModule,
    EventRewardModule,
    RewardModule,
    RewardRequestModule,
    UserActionModule,
  ],
})
export class EventModule {}
