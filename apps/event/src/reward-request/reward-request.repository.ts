import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  RewardRequest,
  RewardRequestDocument,
} from './schema/reward-request.schema';

@Injectable()
export class RewardRequestRepository {
  constructor(
    @InjectModel(RewardRequest.name)
    private readonly rewardRequestModel: Model<RewardRequestDocument>,
  ) {}

  async create(data: Partial<RewardRequest>): Promise<RewardRequest> {
    const created = new this.rewardRequestModel(data);
    return created.save();
  }

  async find(
    query: any,
    sortBy: string,
    sortOrder: 1 | -1,
    skip: number,
    limit: number,
  ): Promise<RewardRequest[]> {
    return this.rewardRequestModel
      .find(query)
      .sort({ [sortBy]: sortOrder } as any)
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async count(query: any): Promise<number> {
    return this.rewardRequestModel.countDocuments(query);
  }

  async findOne(query: any): Promise<RewardRequest | null> {
    return this.rewardRequestModel.findOne(query).exec();
  }

  async findOneAndUpdate(
    filter: any,
    update: any,
    options: any = {},
  ): Promise<any> {
    return this.rewardRequestModel
      .findOneAndUpdate(filter, update, options)
      .exec();
  }

  async exists(filter: any): Promise<boolean> {
    return !!(await this.rewardRequestModel.exists(filter));
  }

  async findOneAndUpdateWithPopulate(
    filter: any,
    update: any,
    options: any = {},
    populateFields: any[] = [],
  ): Promise<any> {
    let query = this.rewardRequestModel.findOneAndUpdate(
      filter,
      update,
      options,
    );
    for (const field of populateFields) {
      query = query.populate(field);
    }
    return query.exec();
  }

  async findWithPopulate(
    query: any,
    sortBy: string,
    sortOrder: 1 | -1,
    skip: number,
    limit: number,
  ) {
    return this.rewardRequestModel
      .find(query)
      .populate({
        path: 'eventReward',
        populate: [{ path: 'event' }, { path: 'reward' }],
      })
      .sort({ [sortBy]: sortOrder } as any)
      .skip(skip)
      .limit(limit)
      .exec();
  }
}
