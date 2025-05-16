import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EventRewardDocument = EventReward & Document;

@Schema({ timestamps: true })
export class EventReward {
  @Prop({ required: true })
  eventId: string;

  @Prop({ required: true })
  rewardId: string;
  
  @Prop({ required: true })
  qty: number;
}

export const EventRewardSchema = SchemaFactory.createForClass(EventReward); 