import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserActionService } from './user-action.service';
import { CreateUserActionDto } from './dto/create-user-action.dto';

@Controller()
export class UserActionController {
  constructor(private readonly userActionService: UserActionService) {}

  @MessagePattern({ cmd: 'event.user-action.create' })
  async create(@Payload() dto: CreateUserActionDto) {
    return this.userActionService.create(dto);
  }

  @MessagePattern({ cmd: 'event.user-action.list' })
  async list() {
    return this.userActionService.findAll();
  }
} 