import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserAction, UserActionSchema } from './schema/user-action.schema';
import { UserActionController } from './user-action.controller';
import { UserActionRepository } from './user-action.repository';
import { UserActionService } from './user-action.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserAction.name, schema: UserActionSchema },
    ]),
  ],
  controllers: [UserActionController],
  providers: [UserActionService, UserActionRepository],
  exports: [UserActionService],
})
export class UserActionModule {}
