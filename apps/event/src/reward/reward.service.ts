import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reward, RewardDocument } from './schema/reward.schema';
import { ListRewardQuery } from './dto/list-reward.query';

@Injectable()
export class RewardService {
  constructor(
    @InjectModel(Reward.name) private readonly rewardModel: Model<RewardDocument>,
  ) {}

  async listRewards(query: ListRewardQuery): Promise<{
    total: number;
    page: number;
    pageSize: number;
    data: Reward[];
  }> {
    const { type, page, pageSize } = query;
    const findQuery: any = {};
    if (type) findQuery.type = type;
    const sortBy = 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.rewardModel
        .find(findQuery)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.rewardModel.countDocuments(findQuery),
    ]);
    return {
      total,
      page,
      pageSize,
      data,
    };
  }
} 