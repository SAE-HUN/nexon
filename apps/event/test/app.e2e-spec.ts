import { Test, TestingModule } from '@nestjs/testing';
import { INestMicroservice } from '@nestjs/common';
import { EventModule } from './../src/event.module';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import * as mongoose from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { Event } from '../src/schemas/event.schema';
import { getModelToken } from '@nestjs/mongoose';

describe('Event Microservice (e2e)', () => {
  let app: INestMicroservice;
  let client: ClientProxy;
  let eventModel: any;

  beforeAll(async () => {
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
  });

  beforeEach(async () => {
    await eventModel.deleteMany({});
  });

  afterAll(async () => {
    await client.close();
    await app.close();
    await mongoose.disconnect();
  });

  it('should create an event (event_create)', async () => {
    const createEventDto = {
      title: 'E2E Event',
      description: 'E2E Desc',
      startedAt: '2024-01-01T00:00:00.000Z',
      endedAt: '2024-01-02T00:00:00.000Z',
      isActive: true,
    };
    const response: any = await firstValueFrom(client.send({ cmd: 'event_create' }, createEventDto));
    expect(response.success).toBe(true);
    expect(response.data.title).toBe(createEventDto.title);
    expect(response.data._id).toBeDefined();
  });

  it('should list events (event_list)', async () => {
    const createEventDto = {
      title: 'List Event',
      description: 'List Desc',
      startedAt: '2024-01-01T00:00:00.000Z',
      endedAt: '2024-01-02T00:00:00.000Z',
      isActive: true,
    };
    await firstValueFrom(client.send({ cmd: 'event_create' }, createEventDto));
    const listEventDto = { sortBy: 'startedAt', sortOrder: 'desc' };
    const response: any = await firstValueFrom(client.send({ cmd: 'event_list' }, listEventDto));
    expect(response.success).toBe(true);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBeGreaterThan(0);
  });

  it('should get event detail (event_detail)', async () => {
    const createEventDto = {
      title: 'Detail Event',
      description: 'Detail Desc',
      startedAt: '2024-01-01T00:00:00.000Z',
      endedAt: '2024-01-02T00:00:00.000Z',
      isActive: true,
    };
    const createRes: any = await firstValueFrom(client.send({ cmd: 'event_create' }, createEventDto));
    const eventId = createRes.data._id;
    const response: any = await firstValueFrom(client.send({ cmd: 'event_detail' }, eventId));
    expect(response.success).toBe(true);
    expect(response.data._id).toBe(eventId);
  });

  it('should fail for not found event (event_detail)', async () => {
    await expect(
      firstValueFrom(client.send({ cmd: 'event_detail' }, '000000000000000000000000'))
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
    await firstValueFrom(client.send({ cmd: 'event_create' }, createEventDto1));
    await firstValueFrom(client.send({ cmd: 'event_create' }, createEventDto2));

    const listEventDtoTrue = {
      isActive: true,
      sortBy: 'startedAt',
      sortOrder: 'desc',
    };
    const resTrue: any = await firstValueFrom(client.send({ cmd: 'event_list' }, listEventDtoTrue));
    expect(resTrue.success).toBe(true);
    expect(resTrue.data.length).toBe(1);
    expect(resTrue.data[0].isActive).toBe(true);

    const listEventDtoFalse = {
      isActive: false,
      sortBy: 'startedAt',
      sortOrder: 'desc',
    };
    const resFalse: any = await firstValueFrom(client.send({ cmd: 'event_list' }, listEventDtoFalse));
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
    await firstValueFrom(client.send({ cmd: 'event_create' }, createEventDtoInRange));
    await firstValueFrom(client.send({ cmd: 'event_create' }, createEventDtoOutRange));

    const listEventDto = {
      startedAt: '2024-01-01T00:00:00.000Z',
      endedAt: '2024-01-02T00:00:00.000Z',
      sortBy: 'startedAt',
      sortOrder: 'asc',
    };
    const res: any = await firstValueFrom(client.send({ cmd: 'event_list' }, listEventDto));
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
    await firstValueFrom(client.send({ cmd: 'event_create' }, createEventDtoEarly));
    await firstValueFrom(client.send({ cmd: 'event_create' }, createEventDtoLate));

    const listEventDto = {
      sortBy: 'startedAt',
      sortOrder: 'asc',
    };
    const res: any = await firstValueFrom(client.send({ cmd: 'event_list' }, listEventDto));
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
      await firstValueFrom(client.send({ cmd: 'event_create' }, createEventDto));
    }
    
    const listEventDto = {
      page: 2,
      pageSize: 10,
      sortBy: 'startedAt',
      sortOrder: 'asc',
    };
    const res: any = await firstValueFrom(client.send({ cmd: 'event_list' }, listEventDto));
    expect(res.success).toBe(true);
    expect(res.page).toBe(2);
    expect(res.pageSize).toBe(10);
    expect(res.total).toBe(25);
    expect(res.data.length).toBe(10);
    
    expect(res.data[0].title).toBe('Event 11');
    expect(res.data[9].title).toBe('Event 20');
  });
});