jest.setTimeout(30000);

import { Test, TestingModule } from '@nestjs/testing';
import { INestMicroservice } from '@nestjs/common';
import { EventModule } from './../src/event.module';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Event } from '../src/schemas/event.schema';
import { Reward } from '../src/schemas/reward.schema';
import { getModelToken } from '@nestjs/mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

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
    });
    await app.listen();

    client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: 4002 },
    });
    await client.connect();

    eventModel = app.get(getModelToken(Event.name));
    rewardModel = app.get(getModelToken(Reward.name));
    eventRewardModel = app.get(getModelToken('EventReward'));
    rewardRequestModel = app.get(getModelToken('RewardRequest'));
  });

  beforeEach(async () => {
    await eventModel.deleteMany({});
    await rewardModel.deleteMany({});
    await eventRewardModel.deleteMany({});
    await rewardRequestModel.deleteMany({});
  });

  afterAll(async () => {
    await client.close();
    await app.close();
    if (replSet) {
      await replSet.stop();
    }
  });

  it('should create an event (event.event.create)', async () => {
    const createEventDto = {
      title: 'E2E Event',
      description: 'E2E Desc',
      startedAt: '2024-01-01T00:00:00.000Z',
      endedAt: '2024-01-02T00:00:00.000Z',
      isActive: true,
    };
    const response: any = await firstValueFrom(client.send({ cmd: 'event.event.create' }, createEventDto));
    expect(response.success).toBe(true);
    expect(response.data.title).toBe(createEventDto.title);
    expect(response.data._id).toBeDefined();
  });

  it('should list events (event.event.list)', async () => {
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
    expect(response.success).toBe(true);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBeGreaterThan(0);
  });

  it('should get event detail (event.event.get)', async () => {
    const createEventDto = {
      title: 'Detail Event',
      description: 'Detail Desc',
      startedAt: '2024-01-01T00:00:00.000Z',
      endedAt: '2024-01-02T00:00:00.000Z',
      isActive: true,
    };
    const createRes: any = await firstValueFrom(client.send({ cmd: 'event.event.create' }, createEventDto));
    const eventId = createRes.data._id;
    const response: any = await firstValueFrom(client.send({ cmd: 'event.event.get' }, eventId));
    expect(response.success).toBe(true);
    expect(response.data._id).toBe(eventId);
  });

  it('should fail for not found event (event.event.get)', async () => {
    await expect(
      firstValueFrom(client.send({ cmd: 'event.event.get' }, '000000000000000000000000'))
    ).rejects.toMatchObject({ message: 'Event not found' });
  });

  it('should filter events by isActive', async () => {
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
    expect(resTrue.success).toBe(true);
    expect(resTrue.data.length).toBe(1);
    expect(resTrue.data[0].isActive).toBe(true);

    const listEventQueryFalse = {
      isActive: false,
      sortBy: 'startedAt',
      sortOrder: 'desc',
    };
    const resFalse: any = await firstValueFrom(client.send({ cmd: 'event.event.list' }, listEventQueryFalse));
    expect(resFalse.success).toBe(true);
    expect(resFalse.data.length).toBe(1);
    expect(resFalse.data[0].isActive).toBe(false);
  });

  it('should filter events by startedAt/endedAt range', async () => {
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
    expect(res.success).toBe(true);
    expect(res.data.length).toBe(1);
    expect(res.data[0].title).toBe('In Range');
  });

  it('should sort events by startedAt asc', async () => {
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
    expect(res.success).toBe(true);
    expect(res.data.length).toBe(2);
    expect(new Date(res.data[0].startedAt).getTime()).toBeLessThan(new Date(res.data[1].startedAt).getTime());
  });

  it('should paginate events correctly', async () => {
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
    expect(res.success).toBe(true);
    expect(res.page).toBe(2);
    expect(res.pageSize).toBe(10);
    expect(res.total).toBe(25);
    expect(res.data.length).toBe(10);
    
    expect(res.data[0].title).toBe('Event 11');
    expect(res.data[9].title).toBe('Event 20');
  });

  async function createTestEventAndReward() {
    const eventDto = {
      title: 'Reward Test Event',
      description: 'Event with rewards',
      startedAt: '2024-01-01T00:00:00.000Z',
      endedAt: '2024-01-31T23:59:59.999Z',
      isActive: true,
    };
    const eventRes: any = await firstValueFrom(client.send({ cmd: 'event.event.create' }, eventDto));
    const eventId = eventRes.data._id;

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

  it('should link reward to event', async () => {
    const { eventId, rewardId } = await createTestEventAndReward();

    const eventRewardDto = {
      eventId,
      rewardId,
      qty: 5
    };
    const linkRes: any = await firstValueFrom(client.send({ cmd: 'event.event-reward.create' }, eventRewardDto));
    expect(linkRes.success).toBe(true);
    expect(linkRes.data.event).toBe(eventId);
    expect(linkRes.data.reward).toBe(rewardId);
    expect(linkRes.data.qty).toBe(5);
  });

  it('should include rewards in event detail', async () => {
    const { eventId, rewardId } = await createTestEventAndReward();

    const eventRewardDto = {
      eventId,
      rewardId,
      qty: 5
    };
    await firstValueFrom(client.send({ cmd: 'event.event-reward.create' }, eventRewardDto));

    const detailRes: any = await firstValueFrom(client.send({ cmd: 'event.event.get' }, eventId));
    expect(detailRes.success).toBe(true);
    expect(detailRes.data._id).toBe(eventId);
    expect(detailRes.data.rewards).toBeDefined();
    expect(Array.isArray(detailRes.data.rewards)).toBe(true);
    expect(detailRes.data.rewards.length).toBe(1);
    
    const returnedReward = detailRes.data.rewards[0];
    expect(returnedReward._id).toBe(rewardId);
    expect(returnedReward.name).toBe('Test Reward');
    expect(returnedReward.description).toBe('Reward Description');
    expect(returnedReward.cmd).toBe('give_item');
    expect(returnedReward.qty).toBe(5);
  });

  it('should prevent duplicate reward-event link', async () => {
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

  it('should support multiple rewards per event', async () => {
    const { eventId, rewardId } = await createTestEventAndReward();

    const eventRewardDto = {
      eventId,
      rewardId,
      qty: 5
    };
    await firstValueFrom(client.send({ cmd: 'event.event-reward.create' }, eventRewardDto));

    const rewardData2 = {
      name: 'Another Reward',
      description: 'Second Reward',
      cmd: 'give_coin',
      type: 'item'
    };
    const reward2 = await rewardModel.create(rewardData2);
    const rewardId2 = reward2._id.toString();


    const eventRewardDto2 = {
      eventId,
      rewardId: rewardId2,
      qty: 10
    };
    await firstValueFrom(client.send({ cmd: 'event.event-reward.create' }, eventRewardDto2));

    const finalRes: any = await firstValueFrom(client.send({ cmd: 'event.event.get' }, eventId));
    expect(finalRes.success).toBe(true);
    expect(finalRes.data.rewards).toBeDefined();
    expect(finalRes.data.rewards.length).toBe(2);

    const hasFirstReward = finalRes.data.rewards.some(r => r._id === rewardId && r.qty === 5);
    const hasSecondReward = finalRes.data.rewards.some(r => r._id === rewardId2 && r.qty === 10);
    expect(hasFirstReward).toBe(true);
    expect(hasSecondReward).toBe(true);
  });

  it('should throw error if event does not exist', async () => {
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

  it('should throw error if reward does not exist', async () => {
    const eventDto = {
      title: 'Event', description: 'D', startedAt: '2024-01-01T00:00:00.000Z', endedAt: '2024-01-02T00:00:00.000Z', isActive: true
    };
    const eventRes: any = await firstValueFrom(client.send({ cmd: 'event.event.create' }, eventDto));
    const eventId = eventRes.data._id;
    const eventRewardDto = {
      eventId,
      rewardId: '000000000000000000000000',
      qty: 1
    };
    await expect(
      firstValueFrom(client.send({ cmd: 'event.event-reward.create' }, eventRewardDto))
    ).rejects.toMatchObject({ message: 'Reward does not exist.' });
  });

  async function createTestEventRewardAndUser() {
    const eventDto = {
      title: 'RewardRequest Event',
      description: 'Event for reward request',
      startedAt: '2024-01-01T00:00:00.000Z',
      endedAt: '2024-01-31T23:59:59.999Z',
      isActive: true,
    };
    const eventRes: any = await firstValueFrom(client.send({ cmd: 'event.event.create' }, eventDto));
    const eventId = eventRes.data._id;

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
    const eventRewardId = eventRewardRes.data._id;

    const userId = '000000000000000000000001'; // 테스트용 임의 ObjectId
    return { eventId, rewardId, eventRewardId, userId };
  }

  it('should create a reward request', async () => {
    const { eventId, eventRewardId, userId } = await createTestEventRewardAndUser();
    const dto = { eventId, rewardId: eventRewardId, userId };
    const res: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, dto));
    expect(res.success).toBe(true);
    expect(res.data.event).toBe(eventId);
    expect(res.data.reward).toBe(eventRewardId);
    expect(res.data.userId).toBe(userId);
  });

  it('should prevent duplicate reward request', async () => {
    const { eventId, eventRewardId, userId } = await createTestEventRewardAndUser();
    const dto = { eventId, rewardId: eventRewardId, userId };
    await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, dto));
    await expect(
      firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, dto))
    ).rejects.toMatchObject({ message: 'Duplicate reward request' });
  });

  it('should fail if event does not exist', async () => {
    const { eventRewardId, userId } = await createTestEventRewardAndUser();
    const dto = { eventId: '000000000000000000000000', rewardId: eventRewardId, userId };
    await expect(
      firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, dto))
    ).rejects.toMatchObject({ message: 'Event not found' });
  });

  it('should fail if eventReward does not exist', async () => {
    const { eventId, userId } = await createTestEventRewardAndUser();
    const dto = { eventId, rewardId: '000000000000000000000000', userId };
    await expect(
      firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, dto))
    ).rejects.toMatchObject({ message: 'EventReward not found' });
  });

  it('should list reward requests by userId', async () => {
    const { eventId, eventRewardId, userId } = await createTestEventRewardAndUser();
    const dto = { eventId, rewardId: eventRewardId, userId };
    await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, dto));
    const query = { userId };
    const res: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.list' }, query));
    expect(res.success).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBe(1);
    expect(res.data[0].userId).toBe(userId);
    expect(res.data[0].status).toBe('PENDING');
  });

  it('should reject a pending reward request', async () => {
    const { eventId, eventRewardId, userId } = await createTestEventRewardAndUser();
    const createDto = { eventId, rewardId: eventRewardId, userId };
    const createRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, createDto));
    const rewardRequestId = createRes.data._id;

    const rejectDto = { rewardRequestId, reason: '조건 미달' };
    const rejectRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.reject' }, rejectDto));
    expect(rejectRes.success).toBe(true);
    expect(rejectRes.data.status).toBe('REJECTED');
    expect(rejectRes.data.reason).toBe('조건 미달');
  });

  it('should not reject a non-pending reward request', async () => {
    const { eventId, eventRewardId, userId } = await createTestEventRewardAndUser();

    const createDto = { eventId, rewardId: eventRewardId, userId };
    const createRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, createDto));
    const rewardRequestId = createRes.data._id;
    await rewardRequestModel.findByIdAndUpdate(rewardRequestId, { status: 'REJECTED' });
    const rejectDto = { rewardRequestId, reason: '이미 거절됨' };
    await expect(
      firstValueFrom(client.send({ cmd: 'event.reward-request.reject' }, rejectDto))
    ).rejects.toMatchObject({ message: 'Only PENDING requests can be rejected' });
    const updated = await rewardRequestModel.findById(rewardRequestId);
    expect(updated.status).toBe('REJECTED');
  });

  it('should fail to reject non-existent reward request', async () => {
    const rejectDto = { rewardRequestId: '000000000000000000000000', reason: '존재하지 않음' };
    await expect(
      firstValueFrom(client.send({ cmd: 'event.reward-request.reject' }, rejectDto))
    ).rejects.toMatchObject({ message: 'RewardRequest not found' });
  });

  it('should process an APPROVED reward request to PROCESSING', async () => {
    const { eventId, eventRewardId, userId } = await createTestEventRewardAndUser();
    const createDto = { eventId, rewardId: eventRewardId, userId };
    const createRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, createDto));
    const rewardRequestId = createRes.data._id;

    await rewardRequestModel.findByIdAndUpdate(rewardRequestId, { status: 'APPROVED' });

    const processRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.process' }, rewardRequestId));
    expect(processRes.success).toBe(true);
    expect(processRes.data.status).toBe('PROCESSING');
  });

  it('should throw error if process is called on non-APPROVED reward request', async () => {
    const { eventId, eventRewardId, userId } = await createTestEventRewardAndUser();
    const createDto = { eventId, rewardId: eventRewardId, userId };
    const createRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, createDto));
    const rewardRequestId = createRes.data._id;
    
    await expect(
      firstValueFrom(client.send({ cmd: 'event.reward-request.process' }, rewardRequestId))
    ).rejects.toMatchObject({ message: 'Only APPROVED requests can be processed' });
  });

  it('should throw error if reward request does not exist when processing', async () => {
    await expect(
      firstValueFrom(client.send({ cmd: 'event.reward-request.process' }, '000000000000000000000000'))
    ).rejects.toMatchObject({ message: 'RewardRequest not found' });
  });

  it('should update reward request to SUCCESS via result message (PROCESSING only)', async () => {
    const { eventId, eventRewardId, userId } = await createTestEventRewardAndUser();
    const createDto = { eventId, rewardId: eventRewardId, userId };
    const createRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, createDto));
    const rewardRequestId = createRes.data._id;
    await rewardRequestModel.findByIdAndUpdate(rewardRequestId, { status: 'APPROVED' });
    const processRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.process' }, rewardRequestId));
    expect(processRes.success).toBe(true);
    expect(processRes.data.status).toBe('PROCESSING');
    const resultDto = { rewardRequestId, status: 'SUCCESS' };
    const resultRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.result' }, resultDto));
    expect(resultRes.success).toBe(true);
    expect(resultRes.data.status).toBe('SUCCESS');
    const updated = await rewardRequestModel.findById(rewardRequestId);
    expect(updated.status).toBe('SUCCESS');
  });

  it('should update reward request to FAILED via result message (PROCESSING only)', async () => {
    const { eventId, eventRewardId, userId } = await createTestEventRewardAndUser();
    const createDto = { eventId, rewardId: eventRewardId, userId };
    const createRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, createDto));
    const rewardRequestId = createRes.data._id;
    await rewardRequestModel.findByIdAndUpdate(rewardRequestId, { status: 'APPROVED' });
    await firstValueFrom(client.send({ cmd: 'event.reward-request.process' }, rewardRequestId));
    const resultDto = { rewardRequestId, status: 'FAILED', reason: '지급 실패' };
    const resultRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.result' }, resultDto));
    expect(resultRes.success).toBe(true);
    expect(resultRes.data.status).toBe('FAILED');
    expect(resultRes.data.reason).toBe('지급 실패');
    const updated = await rewardRequestModel.findById(rewardRequestId);
    expect(updated.status).toBe('FAILED');
    expect(updated.reason).toBe('지급 실패');
  });

  it('should throw error if result is called on non-PROCESSING reward request', async () => {
    const { eventId, eventRewardId, userId } = await createTestEventRewardAndUser();
    const createDto = { eventId, rewardId: eventRewardId, userId };
    const createRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, createDto));
    const rewardRequestId = createRes.data._id;
    // 상태를 PENDING으로 둔 채 result 호출
    const resultDto = { rewardRequestId, status: 'SUCCESS' };
    await expect(
      firstValueFrom(client.send({ cmd: 'event.reward-request.result' }, resultDto))
    ).rejects.toMatchObject({ message: 'Only PROCESSING requests can be updated' });
  });

  it('should throw error if reward request does not exist when result is called', async () => {
    const resultDto = { rewardRequestId: '000000000000000000000000', status: 'SUCCESS' };
    await expect(
      firstValueFrom(client.send({ cmd: 'event.reward-request.result' }, resultDto))
    ).rejects.toMatchObject({ message: 'RewardRequest not found' });
  });

  it('should throw error for invalid status in result message', async () => {
    const { eventId, eventRewardId, userId } = await createTestEventRewardAndUser();
    const createDto = { eventId, rewardId: eventRewardId, userId };
    const createRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, createDto));
    const rewardRequestId = createRes.data._id;
    await rewardRequestModel.findByIdAndUpdate(rewardRequestId, { status: 'APPROVED' });
    await firstValueFrom(client.send({ cmd: 'event.reward-request.process' }, rewardRequestId));
    const resultDto = { rewardRequestId, status: 'INVALID' };
    await expect(
      firstValueFrom(client.send({ cmd: 'event.reward-request.result' }, resultDto))
    ).rejects.toMatchObject({ message: 'Invalid status' });
  });

  it('should approve a pending reward request', async () => {
    const { eventId, eventRewardId, userId } = await createTestEventRewardAndUser();
    const createDto = { eventId, rewardId: eventRewardId, userId };
    const createRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, createDto));
    const rewardRequestId = createRes.data._id;
    const approveRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.approve' }, rewardRequestId));
    expect(approveRes.success).toBe(true);
    expect(approveRes.data.status).toBe('APPROVED');
    const updated = await rewardRequestModel.findById(rewardRequestId);
    expect(updated.status).toBe('APPROVED');
  });

  it('should throw error if reward request does not exist when approving', async () => {
    await expect(
      firstValueFrom(client.send({ cmd: 'event.reward-request.approve' }, '000000000000000000000000'))
    ).rejects.toMatchObject({ message: 'RewardRequest not found' });
  });

  it('should throw error if approving a non-pending reward request', async () => {
    const { eventId, eventRewardId, userId } = await createTestEventRewardAndUser();
    const createDto = { eventId, rewardId: eventRewardId, userId };
    const createRes: any = await firstValueFrom(client.send({ cmd: 'event.reward-request.create' }, createDto));
    const rewardRequestId = createRes.data._id;
    await rewardRequestModel.findByIdAndUpdate(rewardRequestId, { status: 'APPROVED' });
    await expect(
      firstValueFrom(client.send({ cmd: 'event.reward-request.approve' }, rewardRequestId))
    ).rejects.toMatchObject({ message: 'Only PENDING requests can be approved' });
  });
  
  it('should list rewards with pagination and filter', async () => {
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
    expect(resAll.success).toBe(true);
    expect(resAll.total).toBe(15);
    expect(resAll.data.length).toBe(15);
    
    const resPage: any = await firstValueFrom(client.send({ cmd: 'event.reward.list' }, { page: 2, pageSize: 5 }));
    expect(resPage.success).toBe(true);
    expect(resPage.page).toBe(2);
    expect(resPage.pageSize).toBe(5);
    expect(resPage.data.length).toBe(5);
    
    const resFilter: any = await firstValueFrom(client.send({ cmd: 'event.reward.list' }, { type: 'item' }));
    expect(resFilter.success).toBe(true);
    expect(resFilter.data.every((r: any) => r.type === 'item')).toBe(true);

    const resSort: any = await firstValueFrom(client.send({ cmd: 'event.reward.list' }, { sortOrder: 'asc' }));
    expect(resSort.success).toBe(true);
    expect(resSort.data[0].name).toBe('Reward 1');
  });

  it('should list event-rewards with pagination and filter', async () => {
    const event = await eventModel.create({
      title: 'Event for EventReward',
      description: 'desc',
      startedAt: '2024-01-01T00:00:00.000Z',
      endedAt: '2024-01-31T23:59:59.999Z',
      isActive: true,
    });

    const rewards = await Promise.all(Array.from({ length: 8 }).map((_, i) => rewardModel.create({
      name: `ER${i + 1}`,
      description: 'desc',
      cmd: 'give',
      type: 'item',
    })));
    for (let i = 0; i < rewards.length; i++) {
      await eventRewardModel.create({ event: event._id, reward: rewards[i]._id, qty: i + 1 });
    }
    const resAll: any = await firstValueFrom(client.send({ cmd: 'event.event-reward.list' }, {}));
    expect(resAll.success).toBe(true);
    expect(resAll.total).toBe(8);
    expect(resAll.data.length).toBe(8);

    const resPage: any = await firstValueFrom(client.send({ cmd: 'event.event-reward.list' }, { page: 2, pageSize: 3 }));
    expect(resPage.success).toBe(true);
    expect(resPage.page).toBe(2);
    expect(resPage.pageSize).toBe(3);
    expect(resPage.data.length).toBe(3);

    const resFilter: any = await firstValueFrom(client.send({ cmd: 'event.event-reward.list' }, { eventId: event._id.toString() }));
    expect(resFilter.success).toBe(true);
    expect(resFilter.data.every((er: any) => er.event.toString() === event._id.toString() || er.event._id?.toString() === event._id.toString())).toBe(true);
  });
});