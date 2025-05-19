import { INestMicroservice, ValidationPipe } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { of } from 'rxjs';
import { RpcExceptionFilter } from '../../common/rpc-exception.filter';
import { EventReward } from '../src/event-reward/schema/event-reward.schema';
import { EventModule } from '../src/event.module';
import { RewardRequest } from '../src/reward-request/schema/reward-request.schema';
import { Reward } from '../src/reward/schema/reward.schema';

export interface TestContext {
  app: INestMicroservice;
  client: ClientProxy;
  models: {
    Event: any;
    Reward: any;
    EventReward: any;
    RewardRequest: any;
  };
  stop: () => Promise<void>;
  realDateNow: () => number;
}

export async function createTestContext(
  port: number = 4000,
): Promise<TestContext> {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();
  process.env.EVENT_MONGODB_URI = uri;

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [EventModule],
  }).compile();

  const app = moduleFixture.createNestMicroservice({
    transport: Transport.TCP,
    options: { host: '127.0.0.1', port },
    logger: false,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        return new RpcException({ message: errors });
      },
    }),
  );
  app.useGlobalFilters(new RpcExceptionFilter());
  await app.listen();

  const gameClient = app.get<ClientProxy>('GAME_SERVICE');
  jest.spyOn(gameClient, 'send').mockImplementation(() => of(7));

  const client = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: { host: '127.0.0.1', port },
  });
  await client.connect();

  const eventModel = app.get(getModelToken(Event.name));
  const rewardModel = app.get(getModelToken(Reward.name));
  const eventRewardModel = app.get(getModelToken(EventReward.name));
  const rewardRequestModel = app.get(getModelToken(RewardRequest.name));
  const models = {
    Event: eventModel,
    Reward: rewardModel,
    EventReward: eventRewardModel,
    RewardRequest: rewardRequestModel,
  };

  const realDateNow = Date.now;
  jest
    .spyOn(global.Date, 'now')
    .mockImplementation(() => new Date('2024-01-01T12:00:00.000Z').getTime());

  return {
    app,
    client,
    models,
    stop: async () => {
      await client.close();
      await app.close();
      await replSet.stop();
    },
    realDateNow,
  };
}
