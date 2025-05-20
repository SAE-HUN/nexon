jest.setTimeout(30000);

import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, of } from 'rxjs';
import { createTestContext, TestContext } from './bootstrap';

describe('Event', () => {
  let ctx: TestContext;
  let client: ClientProxy;
  let realDateNow: () => number;

  beforeAll(async () => {
    ctx = await createTestContext();
    client = ctx.client;
    const gameClient = ctx.app.get<ClientProxy>('GAME_SERVICE');
    jest.spyOn(gameClient, 'send').mockImplementation(() => of(7));
    realDateNow = Date.now;
    jest
      .spyOn(global.Date, 'now')
      .mockImplementation(() => new Date('2024-01-01T12:00:00.000Z').getTime());
  });

  beforeEach(async () => {
    await ctx.models.Event.deleteMany({});
  });

  afterAll(async () => {
    await ctx.stop();
    Date.now = realDateNow;
  });

  describe('Create', () => {
    it('should create', async () => {
      const createEventDto = {
        title: 'E2E Event',
        description: 'E2E Desc',
        startedAt: '2024-01-01T00:00:00.000Z',
        endedAt: '2024-01-02T00:00:00.000Z',
        isActive: true,
        condition: {
          op: '>=',
          cmd: 'get_login_days',
          field: 'loginDays',
          value: 7,
        },
      };
      const response: any = await firstValueFrom(
        client.send({ cmd: 'event.event.create' }, createEventDto),
      );
      expect(response).toHaveProperty('_id');
      expect(response.title).toBe(createEventDto.title);
    });
    it('should fail with invalid condition', async () => {
      const createEventDto = {
        title: 'Invalid Event',
        description: 'Invalid',
        startedAt: '2024-01-01T00:00:00.000Z',
        endedAt: '2024-01-02T00:00:00.000Z',
        isActive: true,
        condition: { op: '>=', cmd: 'get_login_days', value: 7 },
      };
      await expect(
        firstValueFrom(
          client.send({ cmd: 'event.event.create' }, createEventDto),
        ),
      ).rejects.toMatchObject({ message: 'Invalid condition structure' });
    });
  });

  describe('Validate', () => {
    it('should create and check complex AND/OR condition (all true)', async () => {
      const createEventDto = {
        title: 'Complex AND/OR',
        description: 'complex AND/OR',
        startedAt: '2024-01-01T00:00:00.000Z',
        endedAt: '2024-01-02T00:00:00.000Z',
        isActive: true,
        condition: {
          op: 'AND',
          children: [
            {
              op: '>=',
              cmd: 'get_login_days',
              field: 'loginDays',
              value: 7,
            },
            {
              op: '>=',
              cmd: 'get_referral',
              field: 'referral',
              value: 7,
            },
            {
              op: 'OR',
              children: [
                {
                  op: '>=',
                  cmd: 'get_purchase',
                  field: 'purchase',
                  value: 7,
                },
                {
                  op: '>=',
                  cmd: 'get_score',
                  field: 'score',
                  value: 7,
                },
              ],
            },
          ],
        },
      };
      const eventRes: any = await firstValueFrom(
        client.send({ cmd: 'event.event.create' }, createEventDto),
      );
      const eventId = eventRes._id;
      const checkRes: any = await firstValueFrom(
        client.send(
          { cmd: 'event.event.check-condition' },
          { eventId, userId: 'u1' },
        ),
      );
      expect(checkRes.success).toBe(true);
    });
    it('should fail if any AND child fails', async () => {
      const createEventDto = {
        title: 'AND Fail',
        description: 'AND fail',
        startedAt: '2024-01-01T00:00:00.000Z',
        endedAt: '2024-01-02T00:00:00.000Z',
        isActive: true,
        condition: {
          op: 'AND',
          children: [
            {
              op: '>=',
              cmd: 'get_login_days',
              field: 'loginDays',
              value: 7,
            },
            {
              op: '>=',
              cmd: 'get_referral',
              field: 'referral',
              value: 8,
            },
          ],
        },
      };
      const eventRes: any = await firstValueFrom(
        client.send({ cmd: 'event.event.create' }, createEventDto),
      );
      const eventId = eventRes._id;
      const checkRes: any = await firstValueFrom(
        client.send(
          { cmd: 'event.event.check-condition' },
          { eventId, userId: 'u1' },
        ),
      );
      expect(checkRes.success).toBe(false);
    });
    it('should pass if any OR child passes', async () => {
      const createEventDto = {
        title: 'OR Pass',
        description: 'OR pass',
        startedAt: '2024-01-01T00:00:00.000Z',
        endedAt: '2024-01-02T00:00:00.000Z',
        isActive: true,
        condition: {
          op: 'OR',
          children: [
            {
              op: '>=',
              cmd: 'get_login_days',
              field: 'loginDays',
              value: 8,
            },
            {
              op: '>=',
              cmd: 'get_referral',
              field: 'referral',
              value: 7,
            },
          ],
        },
      };
      const eventRes: any = await firstValueFrom(
        client.send({ cmd: 'event.event.create' }, createEventDto),
      );
      const eventId = eventRes._id;
      const checkRes: any = await firstValueFrom(
        client.send(
          { cmd: 'event.event.check-condition' },
          { eventId, userId: 'u1' },
        ),
      );
      expect(checkRes.success).toBe(true);
    });
    it('should fail if event is not active', async () => {
      const createEventDto = {
        title: 'Inactive Event',
        description: 'inactive',
        startedAt: '2024-01-01T00:00:00.000Z',
        endedAt: '2099-01-02T00:00:00.000Z',
        isActive: false,
        condition: {
          op: '>=',
          cmd: 'get_login_days',
          field: 'loginDays',
          value: 7,
        },
      };
      const eventRes: any = await firstValueFrom(
        client.send({ cmd: 'event.event.create' }, createEventDto),
      );
      const eventId = eventRes._id;
      const checkRes: any = await firstValueFrom(
        client.send(
          { cmd: 'event.event.check-condition' },
          { eventId, userId: 'u1' },
        ),
      );
      expect(checkRes.success).toBe(false);
      expect(checkRes.detail.reason).toBe(
        'Event is not active or not in progress',
      );
    });
    it('should fail if event is not in progress (before start)', async () => {
      const future = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
      const createEventDto = {
        title: 'Future Event',
        description: 'future',
        startedAt: future,
        endedAt: '2099-01-02T00:00:00.000Z',
        isActive: true,
        condition: {
          op: '>=',
          cmd: 'get_login_days',
          field: 'loginDays',
          value: 7,
        },
      };
      const eventRes: any = await firstValueFrom(
        client.send({ cmd: 'event.event.create' }, createEventDto),
      );
      const eventId = eventRes._id;
      const checkRes: any = await firstValueFrom(
        client.send(
          { cmd: 'event.event.check-condition' },
          { eventId, userId: 'u1' },
        ),
      );
      expect(checkRes.success).toBe(false);
      expect(checkRes.detail.reason).toBe(
        'Event is not active or not in progress',
      );
    });
    it('should fail if event is not in progress (after end)', async () => {
      const past = '2023-12-30T00:00:00.000Z';
      const yesterday = '2023-12-31T00:00:00.000Z';
      const createEventDto = {
        title: 'Past Event',
        description: 'past',
        startedAt: past,
        endedAt: yesterday,
        isActive: true,
        condition: {
          op: '>=',
          cmd: 'get_login_days',
          field: 'loginDays',
          value: 7,
        },
      };
      const eventRes: any = await firstValueFrom(
        client.send({ cmd: 'event.event.create' }, createEventDto),
      );
      const eventId = eventRes._id;
      const checkRes: any = await firstValueFrom(
        client.send(
          { cmd: 'event.event.check-condition' },
          { eventId, userId: 'u1' },
        ),
      );
      expect(checkRes.success).toBe(false);
      expect(checkRes.detail.reason).toBe(
        'Event is not active or not in progress',
      );
    });
  });

  describe('List', () => {
    it('should list', async () => {
      const createEventDto = {
        title: 'List Event',
        description: 'List Desc',
        startedAt: '2024-01-01T00:00:00.000Z',
        endedAt: '2024-01-02T00:00:00.000Z',
        isActive: true,
        condition: {
          op: '>=',
          cmd: 'get_login_days',
          field: 'loginDays',
          value: 7,
        },
      };
      await firstValueFrom(
        client.send({ cmd: 'event.event.create' }, createEventDto),
      );
      const listEventQuery = { sortBy: 'startedAt', sortOrder: 'desc' };
      const response: any = await firstValueFrom(
        client.send({ cmd: 'event.event.list' }, listEventQuery),
      );
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
        condition: {
          op: '>=',
          cmd: 'get_login_days',
          field: 'loginDays',
          value: 7,
        },
      };
      const createEventDto2 = {
        title: 'Inactive Event',
        description: 'Inactive',
        startedAt: '2024-01-03T00:00:00.000Z',
        endedAt: '2024-01-04T00:00:00.000Z',
        isActive: false,
        condition: {
          op: '>=',
          cmd: 'get_login_days',
          field: 'loginDays',
          value: 7,
        },
      };
      await firstValueFrom(
        client.send({ cmd: 'event.event.create' }, createEventDto1),
      );
      await firstValueFrom(
        client.send({ cmd: 'event.event.create' }, createEventDto2),
      );

      const listEventQueryTrue = {
        isActive: true,
        sortBy: 'startedAt',
        sortOrder: 'desc',
      };
      const resTrue: any = await firstValueFrom(
        client.send({ cmd: 'event.event.list' }, listEventQueryTrue),
      );
      expect(resTrue).toHaveProperty('data');
      expect(resTrue.data.length).toBe(1);
      expect(resTrue.data[0].isActive).toBe(true);

      const listEventQueryFalse = {
        isActive: false,
        sortBy: 'startedAt',
        sortOrder: 'desc',
      };
      const resFalse: any = await firstValueFrom(
        client.send({ cmd: 'event.event.list' }, listEventQueryFalse),
      );
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
        condition: {
          op: '>=',
          cmd: 'get_login_days',
          field: 'loginDays',
          value: 7,
        },
      };
      const createEventDtoOutRange = {
        title: 'Out Range',
        description: 'Out',
        startedAt: '2024-02-01T00:00:00.000Z',
        endedAt: '2024-02-02T00:00:00.000Z',
        isActive: true,
        condition: {
          op: '>=',
          cmd: 'get_login_days',
          field: 'loginDays',
          value: 7,
        },
      };
      await firstValueFrom(
        client.send({ cmd: 'event.event.create' }, createEventDtoInRange),
      );
      await firstValueFrom(
        client.send({ cmd: 'event.event.create' }, createEventDtoOutRange),
      );

      const listEventQuery = {
        startedAt: '2024-01-01T00:00:00.000Z',
        endedAt: '2024-01-02T00:00:00.000Z',
        sortBy: 'startedAt',
        sortOrder: 'asc',
      };
      const res: any = await firstValueFrom(
        client.send({ cmd: 'event.event.list' }, listEventQuery),
      );
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
        condition: {
          op: '>=',
          cmd: 'get_login_days',
          field: 'loginDays',
          value: 7,
        },
      };
      const createEventDtoLate = {
        title: 'Late',
        description: 'Late',
        startedAt: '2024-02-01T00:00:00.000Z',
        endedAt: '2024-02-02T00:00:00.000Z',
        isActive: true,
        condition: {
          op: '>=',
          cmd: 'get_login_days',
          field: 'loginDays',
          value: 7,
        },
      };
      await firstValueFrom(
        client.send({ cmd: 'event.event.create' }, createEventDtoEarly),
      );
      await firstValueFrom(
        client.send({ cmd: 'event.event.create' }, createEventDtoLate),
      );

      const listEventQuery = {
        sortBy: 'startedAt',
        sortOrder: 'asc',
      };
      const res: any = await firstValueFrom(
        client.send({ cmd: 'event.event.list' }, listEventQuery),
      );
      expect(res).toHaveProperty('data');
      expect(res.data.length).toBe(2);
      expect(new Date(res.data[0].startedAt).getTime()).toBeLessThan(
        new Date(res.data[1].startedAt).getTime(),
      );
    });
    it('should paginate', async () => {
      const events = Array.from({ length: 25 }).map((_, i) => ({
        title: `Event ${i + 1}`,
        description: `Desc ${i + 1}`,
        startedAt: `2024-01-${(i + 1).toString().padStart(2, '0')}T00:00:00.000Z`,
        endedAt: `2024-01-${(i + 2).toString().padStart(2, '0')}T00:00:00.000Z`,
        isActive: true,
        condition: {
          op: '>=',
          cmd: 'get_login_days',
          field: 'loginDays',
          value: 7,
        },
      }));
      for (const createEventDto of events) {
        await firstValueFrom(
          client.send({ cmd: 'event.event.create' }, createEventDto),
        );
      }

      const listEventQuery = {
        page: 2,
        pageSize: 10,
        sortBy: 'startedAt',
        sortOrder: 'asc',
      };
      const res: any = await firstValueFrom(
        client.send({ cmd: 'event.event.list' }, listEventQuery),
      );
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
        condition: {
          op: '>=',
          cmd: 'get_login_days',
          field: 'loginDays',
          value: 7,
        },
      };
      const createRes: any = await firstValueFrom(
        client.send({ cmd: 'event.event.create' }, createEventDto),
      );
      const eventId = createRes._id;
      const response: any = await firstValueFrom(
        client.send({ cmd: 'event.event.get' }, eventId),
      );
      expect(response).toHaveProperty('_id');
      expect(response._id).toBe(eventId);
    });
    it('should fail if not found', async () => {
      await expect(
        firstValueFrom(
          client.send({ cmd: 'event.event.get' }, '000000000000000000000000'),
        ),
      ).rejects.toMatchObject({ message: 'Event not found' });
    });
  });
});
