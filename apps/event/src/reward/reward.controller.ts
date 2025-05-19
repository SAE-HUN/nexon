import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateRewardDto } from './dto/create-reward.dto';
import { ListRewardQuery } from './dto/list-reward.dto';
import { RewardService } from './reward.service';

@Controller()
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @MessagePattern({ cmd: 'event.reward.list' })
  async listRewards(@Payload() query: ListRewardQuery) {
    return await this.rewardService.listRewards(query);
  }

  @MessagePattern({ cmd: 'event.reward.create' })
  async createReward(@Payload() dto: CreateRewardDto) {
    return await this.rewardService.createReward(dto);
  }
}
