import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class UserAction {
  @Prop({ required: true })
  cmd: string;

  @Prop({ required: true })
  field: string;
}

export type UserActionDocument = UserAction & Document;
export const UserActionSchema = SchemaFactory.createForClass(UserAction); 