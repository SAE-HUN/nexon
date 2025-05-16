import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RewardDocument = Reward & Document;

@Schema({ timestamps: true })
export class Reward {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;
  
  @Prop({ required: true })
  cmd: string;
}

export const RewardSchema = SchemaFactory.createForClass(Reward); 