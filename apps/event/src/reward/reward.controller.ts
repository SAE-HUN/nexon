import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { RewardService } from './reward.service';
import { ListRewardQuery } from './dto/list-reward.query';

@Controller()
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @MessagePattern({ cmd: 'event.reward.list' })
  async listRewards(@Payload() query: ListRewardQuery) {
    return await this.rewardService.listRewards(query);
  }
} 