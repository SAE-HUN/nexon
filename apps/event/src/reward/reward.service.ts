import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { CreateRewardDto } from './dto/create-reward.dto';
import { ListRewardQuery } from './dto/list-reward.dto';
import { RewardRepository } from './reward.repository';

@Injectable()
export class RewardService {
  constructor(private readonly rewardRepository: RewardRepository) {}

  async listRewards(query: ListRewardQuery) {
    const { type, sortOrder = 'desc', page = 1, pageSize = 20 } = query;
    const findQuery: any = {};
    if (type) findQuery.type = type;
    const sortBy = 'createdAt';
    const order = sortOrder === 'asc' ? 1 : -1;
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.rewardRepository.find(findQuery, sortBy, order, skip, pageSize),
      this.rewardRepository.count(findQuery),
    ]);
    return {
      total,
      page,
      pageSize,
      data,
    };
  }

  async createReward(dto: CreateRewardDto) {
    const exist = await this.rewardRepository.exists({
      type: dto.type,
      name: dto.name,
    });
    if (exist) {
      throw new RpcException({ message: 'Duplicate reward', status: 400 });
    }
    return this.rewardRepository.create(dto);
  }
}
