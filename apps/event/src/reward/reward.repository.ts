import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reward, RewardDocument } from './schema/reward.schema';

@Injectable()
export class RewardRepository {
  constructor(
    @InjectModel(Reward.name)
    private readonly rewardModel: Model<RewardDocument>,
  ) {}

  async find(query: any, sortBy: string, sortOrder: 1 | -1, skip: number, limit: number): Promise<Reward[]> {
    return this.rewardModel
      .find(query)
      .sort({ [sortBy]: sortOrder } as any)
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async count(query: any): Promise<number> {
    return this.rewardModel.countDocuments(query);
  }

  async findById(id: string): Promise<Reward | null> {
    return this.rewardModel.findById(id).exec();
  }

  async create(createRewardDto: Partial<Reward>): Promise<Reward> {
    const createdReward = new this.rewardModel(createRewardDto);
    return await createdReward.save();
  }

  async findOneByTypeAndName(type: string, name: string): Promise<Reward | null> {
    return this.rewardModel.findOne({ type, name }).exec();
  }
} 