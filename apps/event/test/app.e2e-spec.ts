jest.setTimeout(30000);

import { Test, TestingModule } from '@nestjs/testing';
import { INestMicroservice, ValidationPipe } from '@nestjs/common';
import { EventModule } from './../src/event.module';
import { ClientProxy, ClientProxyFactory, RpcException, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { getModelToken } from '@nestjs/mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { RpcExceptionFilter } from '../../common/rpc-exception.filter';
import { Event } from '../src/event/schema/event.schema';
import { Reward } from '../src/reward/schema/reward.schema';
import { EventReward } from '../src/event-reward/schema/event-reward.schema';
import { RewardRequest } from '../src/reward-request/schema/reward-request.schema';

describe('Event Microservice (e2e)', () => {
  let app: INestMicroservice;
  let client: ClientProxy;
  let eventModel: any;
  let rewardModel: any;
  let eventRewardModel: any;
  let rewardRequestModel: any;
  let replSet: MongoMemoryReplSet;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    process.env.EVENT_MONGODB_URI = uri;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [EventModule],
    }).compile();

    app = moduleFixture.createNestMicroservice({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: 4002 },
      logger: false,
    });
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        return new RpcException({ message: errors });
      },
    }));
    app.useGlobalFilters(new RpcExceptionFilter());
    await app.listen();

    client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: 4002 },
    });
    await client.connect();

    eventModel = app.get(getModelToken(Event.name));
    rewardModel = app.get(getModelToken(Reward.name));
    eventRewardModel = app.get(getModelToken(EventReward.name));
    rewardRequestModel = app.get(getModelToken(RewardRequest.name));
  });

  beforeEach(async () => {
    await eventModel.deleteMany({});
    await rewardModel.deleteMany({});
    await eventRewardModel.deleteMany({});
    await rewardRequestModel.deleteMany({});
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
    if (app) {
      await app.close();
    }
    if (replSet) {
      await replSet.stop();
    }
  });

  // 모든 describe에서 접근 가능한 위치로 이동
  async function createTestEventAndReward() {
    const eventDto = {
      title: 'Reward Test Event',
      description: 'Event with rewards',
      startedAt: '2024-01-01T00:00:00.000Z',
      endedAt: '2024-01-31T23:59:59.999Z',
      isActive: true,
    };
    const eventRes: any = await firstValueFrom(client.send({ cmd: 'event.event.create' }, eventDto));
    const eventId = eventRes._id;

    const rewardData = {
      name: 'Test Reward',
      description: 'Reward Description',
      cmd: 'give_item',
      type: 'item'
    };
    const reward = await rewardModel.create(rewardData);
    const rewardId = reward._id.toString();

    return { eventId, rewardId };
  }

  async function createTestEventRewardAndUser() {
    const eventDto = {
      title: 'RewardRequest Event',
      description: 'Event for reward request',
      startedAt: '2024-01-01T00:00:00.000Z',
      endedAt: '2024-01-31T23:59:59.999Z',
      isActive: true,
    };
    const eventRes: any = await firstValueFrom(client.send({ cmd: 'event.event.create' }, eventDto));
    const eventId = eventRes._id;

    const rewardData = {
      name: 'RewardRequest Reward',
      description: 'Reward for reward request',
      cmd: 'give_item',
      type: 'item',
    };
    const reward = await rewardModel.create(rewardData);
    const rewardId = reward._id.toString();

    const eventRewardDto = { eventId, rewardId, qty: 1 };
    const eventRewardRes: any = await firstValueFrom(client.send({ cmd: 'event.event-reward.create' }, eventRewardDto));
    const eventRewardId = eventRewardRes._id;

    const userId = '000000000000000000000001'; // 테스트용 임의 ObjectId
    return { eventId, rewardId, eventRewardId, userId };
  }

  // ===== Event =====
  describe('Event', () => {
    it('should create', async () => {
      const createEventDto = {
        title: 'E2E Event',
        description: 'E2E Desc',
        startedAt: '2024-01-01T00:00:00.000Z',
        endedAt: '2024-01-02T00:00:00.000Z',
        isActive: true,
      };
      const response: any = await firstValueFrom(client.send({ cmd: 'event.event.create' }, createEventDto));
      expect(response).toHaveProperty('_id');
      expect(response.title).toBe(createEventDto.title);
    });

    it('should list', async () => {
      const createEventDto = {
        title: 'List Event',
        description: 'List Desc',
        startedAt: '2024-01-01T00:00:00.000Z',
        endedAt: '2024-01-02T00:00:00.000Z',
        isActive: true,
      };
      await firstValueFrom(client.send({ cmd: 'event.event.create' }, createEventDto));
      const listEventQuery = { sortBy: 'startedAt', sortOrder: 'desc' };
      const response: any = await firstValueFrom(client.send({ cmd: 'event.event.list' }, listEventQuery));
      expect(response).toHaveProperty('data');
      expect(response.data.length).toBeGreaterThan(0);
    });

    it('should filter by isActive', async () => {
      const createEventDto1 = {
        title: 'Active Event',
        description: 'Active',
        startedAt: '2024-01-01T00:00:00.000Z',
        endedAt: '2024-01-02T00:00:00.000Z',
        isActive: true,
      };
      const createEventDto2 = {
        title: 'Inactive Event',
        description: 'Inactive',
        startedAt: '2024-01-03T00:00:00.000Z',
        endedAt: '2024-01-04T00:00:00.000Z',
        isActive: false,
      };
      await firstValueFrom(client.send({ cmd: 'event.event.create' }, createEventDto1));
      await firstValueFrom(client.send({ cmd: 'event.event.create' }, createEventDto2));

      const listEventQueryTrue = {
        isActive: true,
        sortBy: 'startedAt',
        sortOrder: 'desc',
      };
      const resTrue: any = await firstValueFrom(client.send({ cmd: 'event.event.list' }, listEventQueryTrue));
      expect(resTrue).toHaveProperty('data');
      expect(resTrue.data.length).toBe(1);
      expect(resTrue.data[0].isActive).toBe(true);

      const listEventQueryFalse = {
        isActive: false,
        sortBy: 'startedAt',
        sortOrder: 'desc',
      };
      const resFalse: any = await firstValueFrom(client.send({ cmd: 'event.event.list' }, listEventQueryFalse));
      expect(resFalse).toHaveProperty('data');
      expect(resFalse.data.length).toBe(1);
      expect(resFalse.data[0].isActive).toBe(false);
    });

    it('should filter by startedAt/endedAt', async () => {
      const createEventDtoInRange = {
        title: 'In Range',
        description: 'In',
        startedAt: '2024-01-01T00:00:00.000Z',
        endedAt: '2024-01-02T00:00:00.000Z',
        isActive: true,
      };
      const createEventDtoOutRange = {
        title: 'Out Range',
        description: 'Out',
        startedAt: '2024-02-01T00:00:00.000Z',
        endedAt: '2024-02-02T00:00:00.000Z',
        isActive: true,
      };
      await firstValueFrom(client.send({ cmd: 'event.event.create' }, createEventDtoInRange));
      await firstValueFrom(client.send({ cmd: 'event.event.create' }, createEventDtoOutRange));

      const listEventQuery = {
        startedAt: '2024-01-01T00:00:00.000Z',
        endedAt: '2024-01-02T00:00:00.000Z',
        sortBy: 'startedAt',
        sortOrder: 'asc',
      };
      const res: any = await firstValueFrom(client.send({ cmd: 'event.event.list' }, listEventQuery));
      expect(res).toHaveProperty('data');
      expect(res.data.length).toBe(1);
      expect(res.data[0].title).toBe('In Range');
    });

    it('should sort by startedAt asc', async () => {
      const createEventDtoEarly = {
        title: 'Early',
        description: 'Early',
        startedAt: '2024-01-01T00:00:00.000Z',
        endedAt: '2024-01-02T00:00:00.000Z',
        isActive: true,
      };
      const createEventDtoLate = {
        title: 'Late',
        description: 'Late',
        startedAt: '2024-02-01T00:00:00.000Z',
        endedAt: '2024-02-02T00:00:00.000Z',
        isActive: true,
      };
      await firstValueFrom(client.send({ cmd: 'event.event.create' }, createEventDtoEarly));
      await firstValueFrom(client.send({ cmd: 'event.event.create' }, createEventDtoLate));

      const listEventQuery = {
        sortBy: 'startedAt',
        sortOrder: 'asc',
      };
      const res: any = await firstValueFrom(client.send({ cmd: 'event.event.list' }, listEventQuery));
      expect(res).toHaveProperty('data');
      expect(res.data.length).toBe(2);
      expect(new Date(res.data[0].startedAt).getTime()).toBeLessThan(new Date(res.data[1].startedAt).getTime());
    });

    it('should paginate', async () => {
      const events = Array.from({ length: 25 }).map((_, i) => ({
        title: `Event ${i + 1}`,
        description: `Desc ${i + 1}`,
        startedAt: `2024-01-${(i + 1).toString().padStart(2, '0')}T00:00:00.000Z`,
        endedAt: `2024-01-${(i + 2).toString().padStart(2, '0')}T00:00:00.000Z`,
        isActive: true,
      }));
      for (const createEventDto of events) {
        await firstValueFrom(client.send({ cmd: 'event.event.create' }, createEventDto));
      }
      
      const listEventQuery = {
        page: 2,
        pageSize: 10,
        sortBy: 'startedAt',
        sortOrder: 'asc',
      };
      const res: any = await firstValueFrom(client.send({ cmd: 'event.event.list' }, listEventQuery));
      expect(res).toHaveProperty('page');
      expect(res.page).toBe(2);
      expect(res).toHaveProperty('pageSize');
      expect(res.pageSize).toBe(10);
      expect(res).toHaveProperty('total');
      expect(res.total).toBe(25);
      expect(res).toHaveProperty('data');
      expect(res.data.length).toBe(10);
      
      expect(res.data[0].title).toBe('Event 11');
      expect(res.data[9].title).toBe('Event 20');
    });

    it('should get detail', async () => {
      const createEventDto = {
        title: 'Detail Event',
        description: 'Detail Desc',
        startedAt: '2024-01-01T00:00:00.000Z',
        endedAt: '2024-01-02T00:00:00.000Z',
        isActive: true,
      };
      const createRes: any = await firstValueFrom(client.send({ cmd: 'event.event.create' }, createEventDto));
      const eventId = createRes._id;
      const response: any = await firstValueFrom(client.send({ cmd: 'event.event.get' }, eventId));
      expect(response).toHaveProperty('_id');
      expect(response._id).toBe(eventId);
    });

    it('should fail if not found', async () => {
      await expect(
        firstValueFrom(client.send({ cmd: 'event.event.get' }, '000000000000000000000000'))
      ).rejects.toMatchObject({ message: 'Event not found' });
    });
  });

  // ===== Event-Reward =====
  describe('EventReward', () => {
    it('should link reward to event', async () => {
      const { eventId, rewardId } = await createTestEventAndReward();

      const eventRewardDto = {
        eventId,
        rewardId,
        qty: 5
      };
      const linkRes: any = await firstValueFrom(client.send({ cmd: 'event.event-reward.create' }, eventRewardDto));
      expect(linkRes).toHaveProperty('event');
      expect(linkRes.event).toBe(eventId);
      expect(linkRes).toHaveProperty('reward');
      expect(linkRes.reward).toBe(rewardId);
      expect(linkRes).toHaveProperty('qty');
      expect(linkRes.qty).toBe(5);
    });

    it('should prevent duplication', async () => {
      const { eventId, rewardId } = await createTestEventAndReward();

      const eventRewardDto = {
        eventId,
        rewardId,
        qty: 5
      };
      await firstValueFrom(client.send({ cmd: 'event.event-reward.create' }, eventRewardDto));

      await expect(
        firstValueFrom(client.send({ cmd: 'event.event-reward.create' }, eventRewardDto))
      ).rejects.toMatchObject({ message: 'This reward is already linked to the event.' });
    });

    it('should fail if event does not exist', async () => {
      const reward = await rewardModel.create({ name: 'R', description: 'D', cmd: 'cmd', type: 'item' });
      const eventRewardDto = {
        eventId: '000000000000000000000000',
        rewardId: reward._id.toString(),
        qty: 1
      };
      await expect(
        firstValueFrom(client.send({ cmd: 'event.event-reward.create' }, eventRewardDto))
      ).rejects.toMatchObject({ message: 'Event does not exist.' });
    });

    it('should fail if reward does not exist', async () => {
      const eventDto = {
        title: 'Event', description: 'D', startedAt: '2024-01-01T00:00:00.000Z', endedAt: '2024-01-02T00:00:00.000Z', isActive: true
      };
      const eventRes: any = await firstValueFrom(client.send({ cmd: 'event.event.create' }, eventDto));
      const eventId = eventRes._id;
      const eventRewardDto = {
        eventId,
        rewardId: '000000000000000000000000',
        qty: 1
      };
      await expect(
        firstValueFrom(client.send({ cmd: 'event.event-reward.create' }, eventRewardDto))
      ).rejects.toMatchObject({ message: 'Reward does not exist.' });
    });

    it('should list with pagination and filter', async () => {
      const eventDto = {
        title: 'Event for EventReward',
        description: 'desc',
        startedAt: '2024-01-01T00:00:00.000Z',
        endedAt: '2024-01-31T23:59:59.999Z',
        isActive: true,
      };
      const eventRes: any = await firstValueFrom(client.send({ cmd: 'event.event.create' }, eventDto));
      const event = eventRes._id;

      const rewards = await Promise.all(Array.from({ length: 8 }).map((_, i) => rewardModel.create({
        name: `ER${i + 1}`,
        description: 'desc',
        cmd: 'give',
        type: 'item',
      })));
      for (let i = 0; i < rewards.length; i++) {
        await firstValueFrom(client.send({
          cmd: 'event.event-reward.create'
        }, {
          eventId: event,
          rewardId: rewards[i]._id,
          qty: i + 1
        }));
      }
      const resAll: any = await firstValueFrom(client.send({ cmd: 'event.event-reward.list' }, {}));
      expect(resAll).toHaveProperty('data');
      expect(resAll.data.length).toBe(8);

      const resPage: any = await firstValueFrom(client.send({ cmd: 'event.event-reward.list' }, { page: 2, pageSize: 3 }));
      expect(resPage).toHaveProperty('page');
      expect(resPage.page).toBe(2);
      expect(resPage).toHaveProperty('pageSize');
      expect(resPage.pageSize).toBe(3);
      expect(resPage.data.length).toBe(3);

      const resFilter: any = await firstValueFrom(client.send({ cmd: 'event.event-reward.list' }, { eventId: event.toString() }));
      expect(resFilter).toHaveProperty('data');
      expect(resFilter.data.every((er: any) => er.event.toString() === event.toString() || er.event._id?.toString() === event.toString())).toBe(true);
    });
  });

  // ===== Reward =====
  describe('Reward', () => {
    it('should list with pagination and filter', async () => {
      // Create rewards
      const rewards = Array.from({ length: 15 }).map((_, i) => ({
        name: `Reward ${i + 1}`,
        description: `Desc ${i + 1}`,
        cmd: 'give_item',
        type: i % 2 === 0 ? 'item' : 'point',
      }));
      for (const reward of rewards) {
        await rewardModel.create(reward);
      }
      
      const resAll: any = await firstValueFrom(client.send({ cmd: 'event.reward.list' }, {}));
      expect(resAll).toHaveProperty('data');
      expect(resAll.data.length).toBe(15);
      
      const resPage: any = await firstValueFrom(client.send({ cmd: 'event.reward.list' }, { page: 2, pageSize: 5 }));
      expect(resPage).toHaveProperty('data');
      expect(resPage.data.length).toBe(5);
      expect(resPage.page).toBe(2);
      expect(resPage).toHaveProperty('pageSize');
      expect(resPage.pageSize).toBe(5);
      expect(resPage.data.length).toBe(5);
      
      const resFilter: any = await firstValueFrom(client.send({ cmd: 'event.reward.list' }, { type: 'item' }));
      expect(resFilter).toHaveProperty('data');
      expect(resFilter.data.every((r: any) => r.type === 'item')).toBe(true);

      const resSort: any = await firstValueFrom(client.send({ cmd: 'event.reward.list' }, { sortOrder: 'asc' }));
      expect(resSort).toHaveProperty('data');
      expect(resSort.data[0].name).toBe('Reward 1');
    });
  });

  // ===== Reward-Request =====
  describe('RewardRequest', () => {
    it('should create', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const dto = { eventRewardId, userId };
      const res: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, dto));
      expect(res).toHaveProperty('eventReward');
      expect(res.eventReward).toBe(eventRewardId);
      expect(res).toHaveProperty('userId');
      expect(res.userId).toBe(userId);
    });

    it('should prevent duplicate', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const dto = { eventRewardId, userId };
      await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, dto));
      await expect(
        firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, dto))
      ).rejects.toMatchObject({ message: 'Duplicate reward request' });
    });

    it('should fail if eventReward does not exist', async () => {
      const userId = '000000000000000000000000';
      const dto = { eventRewardId: '000000000000000000000000', userId };
      await expect(
        firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, dto))
      ).rejects.toMatchObject({ message: 'EventReward not found' });
    });

    it('should list by userId', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const dto = { eventRewardId, userId };
      await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, dto));
      const query = { userId };
      const res: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.list' }, query));
      expect(res).toHaveProperty('data');
      expect(res.data.length).toBe(1);
      expect(res.data[0].userId).toBe(userId);
      expect(res.data[0]).toHaveProperty('status');
      expect(res.data[0].status).toBe('PENDING');
    });

    it('should reject pending', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const createDto = { eventRewardId, userId };
      const createRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, createDto));
      const rewardRequestId = createRes._id;

      const rejectDto = { rewardRequestId, reason: '조건 미달' };
      const rejectRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.reject' }, rejectDto));
      expect(rejectRes).toHaveProperty('status');
      expect(rejectRes.status).toBe('REJECTED');
      expect(rejectRes).toHaveProperty('reason');
      expect(rejectRes.reason).toBe('조건 미달');
    });

    it('should not reject non-pending', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();

      const createDto = { eventRewardId, userId };
      const createRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, createDto));
      const rewardRequestId = createRes._id;
      await firstValueFrom(client.send({ cmd: 'event.reward-request.reject' }, { rewardRequestId, reason: '이미 거절됨' }));
      const rejectDto = { rewardRequestId, reason: '이미 거절됨' };
      await expect(
        firstValueFrom(client.send({ cmd: 'event.reward-request.reject' }, rejectDto))
      ).rejects.toMatchObject({ message: 'Only PENDING requests can be rejected' });
      const updated = await rewardRequestModel.findById(rewardRequestId);
      expect(updated.status).toBe('REJECTED');
    });

    it('should fail to reject non-existent', async () => {
      const rejectDto = { rewardRequestId: '000000000000000000000000', reason: '존재하지 않음' };
      await expect(
        firstValueFrom(client.send({ cmd: 'event.reward-request.reject' }, rejectDto))
      ).rejects.toMatchObject({ message: 'RewardRequest not found' });
    });

    it('should approve pending', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const createDto = { eventRewardId, userId };
      const createRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, createDto));
      const rewardRequestId = createRes._id;
      const approveRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.approve' }, rewardRequestId));
      expect(approveRes).toHaveProperty('status');
      expect(approveRes.status).toBe('APPROVED');
      const updated = await rewardRequestModel.findById(rewardRequestId);
      expect(updated.status).toBe('APPROVED');
    });

    it('should fail to approve non-existent', async () => {
      await expect(
        firstValueFrom(client.send({ cmd: 'event.reward-request.approve' }, '000000000000000000000000'))
      ).rejects.toMatchObject({ message: 'RewardRequest not found' });
    });

    it('should fail to approve non-pending', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const createDto = { eventRewardId, userId };
      const createRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, createDto));
      const rewardRequestId = createRes._id;
      await firstValueFrom(client.send({ cmd: 'event.reward-request.approve' }, rewardRequestId));
      await expect(
        firstValueFrom(client.send({ cmd: 'event.reward-request.approve' }, rewardRequestId))
      ).rejects.toMatchObject({ message: 'Only PENDING requests can be approved' });
    });
    
    it('should process approved to processing', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const createDto = { eventRewardId, userId };
      const createRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, createDto));
      const rewardRequestId = createRes._id;

      await firstValueFrom(client.send({ cmd: 'event.reward-request.approve' }, rewardRequestId));

      const processRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.process' }, rewardRequestId));
      expect(processRes).toHaveProperty('status');
      expect(processRes.status).toBe('PROCESSING');
    });

    it('should fail to process non-approved', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const createDto = { eventRewardId, userId };
      const createRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, createDto));
      const rewardRequestId = createRes._id;
      
      await expect(
        firstValueFrom(client.send({ cmd: 'event.reward-request.process' }, rewardRequestId))
      ).rejects.toMatchObject({ message: 'Only APPROVED requests can be processed' });
    });

    it('should fail to process non-existent', async () => {
      await expect(
        firstValueFrom(client.send({ cmd: 'event.reward-request.process' }, '000000000000000000000000'))
      ).rejects.toMatchObject({ message: 'RewardRequest not found' });
    });

    it('should update to SUCCESS via result', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const createDto = { eventRewardId, userId };
      const createRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, createDto));
      const rewardRequestId = createRes._id;
      await firstValueFrom(client.send({ cmd: 'event.reward-request.approve' }, rewardRequestId));
      const processRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.process' }, rewardRequestId));
      expect(processRes).toHaveProperty('status');
      expect(processRes.status).toBe('PROCESSING');
      const resultDto = { rewardRequestId, status: 'SUCCESS' };
      const resultRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.result' }, resultDto));
      expect(resultRes).toHaveProperty('status');
      expect(resultRes.status).toBe('SUCCESS');
      const updated = await rewardRequestModel.findById(rewardRequestId);
      expect(updated.status).toBe('SUCCESS');
    });

    it('should update to FAILED via result', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const createDto = { eventRewardId, userId };
      const createRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, createDto));
      const rewardRequestId = createRes._id;
      await firstValueFrom(client.send({ cmd: 'event.reward-request.approve' }, rewardRequestId));
      await firstValueFrom(client.send({ cmd: 'event.reward-request.process' }, rewardRequestId));
      const resultDto = { rewardRequestId, status: 'FAILED', reason: '지급 실패' };
      const resultRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.result' }, resultDto));
      expect(resultRes).toHaveProperty('status');
      expect(resultRes.status).toBe('FAILED');
      expect(resultRes).toHaveProperty('reason');
      expect(resultRes.reason).toBe('지급 실패');
      const updated = await rewardRequestModel.findById(rewardRequestId);
      expect(updated.status).toBe('FAILED');
      expect(updated.reason).toBe('지급 실패');
    });

    it('should fail result on non-processing', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const createDto = { eventRewardId, userId };
      const createRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, createDto));
      const rewardRequestId = createRes._id;
      // 상태를 PENDING으로 둔 채 result 호출
      const resultDto = { rewardRequestId, status: 'SUCCESS' };
      await expect(
        firstValueFrom(client.send({ cmd: 'event.reward-request.result' }, resultDto))
      ).rejects.toMatchObject({ message: 'Only PROCESSING requests can be updated' });
    });

    it('should fail result on non-existent', async () => {
      const resultDto = { rewardRequestId: '000000000000000000000000', status: 'SUCCESS' };
      await expect(
        firstValueFrom(client.send({ cmd: 'event.reward-request.result' }, resultDto))
      ).rejects.toMatchObject({ message: 'RewardRequest not found' });
    });

    it('should fail result on invalid status', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const createDto = { eventRewardId, userId };
      const createRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, createDto));
      const rewardRequestId = createRes._id;
      await firstValueFrom(client.send({ cmd: 'event.reward-request.approve' }, rewardRequestId));
      await firstValueFrom(client.send({ cmd: 'event.reward-request.process' }, rewardRequestId));
      const resultDto = { rewardRequestId, status: 'INVALID' };
      await expect(
        firstValueFrom(client.send({ cmd: 'event.reward-request.result' }, resultDto))
      ).rejects.toMatchObject(expect.anything());
    });
  });
});