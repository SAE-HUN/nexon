import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import {
  EventReward,
  EventRewardDocument,
} from '../../event-reward/schema/event-reward.schema';

export enum RewardRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export type RewardRequestDocument = RewardRequest & Document;

@Schema({ timestamps: true })
export class RewardRequest {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: EventReward.name,
    required: true,
  })
  eventReward: EventRewardDocument;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  userId: string;

  @Prop({
    type: String,
    enum: RewardRequestStatus,
    default: RewardRequestStatus.PENDING,
    required: true,
  })
  status: RewardRequestStatus;

  @Prop({ type: String, default: null })
  reason: string | null;
}

export const RewardRequestSchema = SchemaFactory.createForClass(RewardRequest);
RewardRequestSchema.index({ eventReward: 1, userId: 1 }, { unique: true });
RewardRequestSchema.index({ eventReward: 1 });
RewardRequestSchema.index({ userId: 1 });
