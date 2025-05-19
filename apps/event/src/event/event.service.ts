import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CreateEventDto } from './dto/create-event.dto';
import { ListEventQuery } from './dto/list-event.dto';
import { EventRepository } from './event.repository';
import { Condition } from './schema/event.schema';

@Injectable()
export class EventService {
  constructor(
    private readonly eventRepository: EventRepository,
    @Inject('GAME_SERVICE') private readonly gameClient: ClientProxy,
  ) {}

  private validateConditionTree(
    condition: Condition,
    maxDepth: number = 3,
    maxLeafCount: number = 4,
  ): { valid: boolean; reason?: string } {
    let leafCount = 0;
    function traverse(node: Condition, depth: number): boolean {
      if (depth > maxDepth) return false;
      if (node.op === 'AND' || node.op === 'OR') {
        if (!Array.isArray(node.children) || node.children.length === 0)
          return false;
        for (const child of node.children) {
          if (!traverse(child, depth + 1)) return false;
        }
        return true;
      } else if (['==', '>=', '<='].includes(node.op)) {
        if (!node.cmd || !node.field || typeof node.value !== 'number')
          return false;
        leafCount++;
        return true;
      } else {
        return false;
      }
    }
    const valid =
      traverse(condition, 1) && leafCount > 0 && leafCount <= maxLeafCount;
    if (!valid) {
      if (leafCount > maxLeafCount)
        return {
          valid: false,
          reason: 'Too many leaf conditions (max ' + maxLeafCount + ')',
        };
      return { valid: false, reason: 'Invalid condition structure' };
    }
    return { valid: true };
  }

  private async evalCondition(
    node: Condition,
    userId: string,
  ): Promise<{ success: boolean; detail: any }> {
    if (node.op === 'AND') {
      const results = await Promise.all(
        node.children!.map((child) => this.evalCondition(child, userId)),
      );
      return { success: results.every((r) => r.success), detail: results };
    } else if (node.op === 'OR') {
      const results = await Promise.all(
        node.children!.map((child) => this.evalCondition(child, userId)),
      );
      return { success: results.some((r) => r.success), detail: results };
    } else if (['==', '>=', '<='].includes(node.op)) {
      let userValue: number;
      try {
        userValue = await firstValueFrom(
          this.gameClient.send(node.cmd!, { userId, field: node.field! }),
        );
      } catch (e) {
        throw new RpcException({ message: 'Game server error', status: 500 });
      }
      let success = false;
      if (node.op === '==') success = userValue === node.value!;
      if (node.op === '>=') success = userValue >= node.value!;
      if (node.op === '<=') success = userValue <= node.value!;
      return {
        success,
        detail: {
          field: node.field,
          userValue,
          expected: node.value,
          op: node.op,
        },
      };
    } else {
      return { success: false, detail: { error: 'Invalid op' } };
    }
  }

  async createEvent(createEventDto: CreateEventDto) {
    const { condition } = createEventDto;
    const result = this.validateConditionTree(condition);
    if (!result.valid) {
      throw new RpcException({ message: result.reason, status: 400 });
    }
    return await this.eventRepository.create(createEventDto);
  }

  async listEvents(query: ListEventQuery) {
    const {
      isActive,
      startedAt,
      endedAt,
      sortBy = 'startedAt',
      sortOrder = 'desc',
      page = 1,
      pageSize = 20,
    } = query;
    const findQuery: any = {};
    if (isActive !== undefined) {
      findQuery.isActive = isActive;
    }
    if (startedAt) {
      findQuery.startedAt = { $gte: new Date(startedAt) };
    }
    if (endedAt) {
      findQuery.endedAt = { $lte: new Date(endedAt) };
    }
    const order = sortOrder === 'asc' ? 1 : -1;
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.eventRepository.find(findQuery, sortBy, order, skip, pageSize),
      this.eventRepository.count(findQuery),
    ]);
    return {
      total,
      page,
      pageSize,
      data,
    };
  }

  async getEventDetail(eventId: string) {
    const event = await this.eventRepository.findById(eventId);
    if (!event)
      throw new RpcException({ message: 'Event not found', status: 404 });
    return event;
  }

  async checkUserEventCondition(
    eventId: string,
    userId: string,
  ): Promise<{ success: boolean; detail: any }> {
    const event = await this.eventRepository.findById(eventId);
    if (!event)
      throw new RpcException({ message: 'Event not found', status: 404 });
    const now = new Date(Date.now());
    if (!event.isActive || now < event.startedAt || now > event.endedAt) {
      return {
        success: false,
        detail: { reason: 'Event is not active or not in progress' },
      };
    }
    const result = await this.evalCondition(event.condition, userId);
    return result;
  }
}
