import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Reward } from '../../reward/schema/reward.schema';
import { Event } from '../../event/schema/event.schema';
import { EventDocument } from '../../event/schema/event.schema';
import { RewardDocument } from '../../reward/schema/reward.schema';

export type EventRewardDocument = EventReward & Document;

@Schema({ timestamps: true })
export class EventReward {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Event.name,
    required: true,
  })
  event: EventDocument;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Reward.name,
    required: true,
  })
  reward: RewardDocument; 
  
  @Prop({ required: true })
  qty: number;
}

export const EventRewardSchema = SchemaFactory.createForClass(EventReward);
EventRewardSchema.index({ event: 1, reward: 1 }, { unique: true }); 