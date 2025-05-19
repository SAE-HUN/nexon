import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserActionDto } from './dto/create-user-action.dto';
import { UserAction, UserActionDocument } from './schema/user-action.schema';

@Injectable()
export class UserActionRepository {
  constructor(
    @InjectModel(UserAction.name)
    private readonly userActionModel: Model<UserActionDocument>,
  ) {}

  async create(createUserActionDto: CreateUserActionDto) {
    const created = new this.userActionModel(createUserActionDto);
    return created.save();
  }

  async findAll() {
    return this.userActionModel.find().exec();
  }
}
