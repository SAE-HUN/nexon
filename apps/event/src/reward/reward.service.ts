import { Injectable } from '@nestjs/common';
import { RewardRepository } from './reward.repository';
import { ListRewardQuery } from './dto/list-reward.query';

@Injectable()
export class RewardService {
  constructor(
    private readonly rewardRepository: RewardRepository,
  ) {}

  async listRewards(query: ListRewardQuery) {
    const { type, page, pageSize, sortOrder } = query;
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
} 