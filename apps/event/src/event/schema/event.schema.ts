import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EventDocument = Event & Document;

@Schema({ timestamps: true })
export class Event {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  startedAt: Date;

  @Prop({ required: true })
  endedAt: Date;

  @Prop({ required: true })
  isActive: boolean;

  @Prop({
    type: Object,
    required: true,
  })
  condition: Condition;
}

export interface Condition {
  op: 'AND' | 'OR' | '==' | '>=' | '<=';
  children?: Condition[];
  cmd?: string;
  field?: string;
  value?: number;
}

export const EventSchema = SchemaFactory.createForClass(Event);
