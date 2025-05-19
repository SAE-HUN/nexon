import { Injectable } from '@nestjs/common';
import { UserActionRepository } from './user-action.repository';
import { CreateUserActionDto } from './dto/create-user-action.dto';

@Injectable()
export class UserActionService {
  constructor(private readonly userActionRepository: UserActionRepository) {}

  async create(createUserActionDto: CreateUserActionDto) {
    return this.userActionRepository.create(createUserActionDto);
  }

  async findAll() {
    return this.userActionRepository.findAll();
  }
} 