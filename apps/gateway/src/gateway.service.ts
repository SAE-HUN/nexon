import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GatewayService {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('EVENT_SERVICE') private readonly eventClient: ClientProxy,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }
  
  async proxyToAuth(cmd: string, data?: any): Promise<any> {
    return await firstValueFrom(this.authClient.send({ cmd }, data));
  }

  async proxyToEvent(cmd: string, data?: any): Promise<any> {
    return await firstValueFrom(this.eventClient.send({ cmd }, data));
  }
}
