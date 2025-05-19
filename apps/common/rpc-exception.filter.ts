import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { throwError } from 'rxjs';

@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RpcExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    if (!(exception instanceof RpcException)) {
      exception = new RpcException({
        message: (exception as any).message || 'Internal server error',
        status: 500,
      });
    }

    const args = host.getArgs();
    const tcpContextArgs = args[args.length - 1].args;
    const channel = JSON.parse(tcpContextArgs[1]);
    const payload = args[0];
    const log = {
      timestamp: new Date().toISOString(),
      exception,
      cmd: channel.cmd,
      payload,
    };
    this.logger.error(JSON.stringify(log));

    return throwError(() => (exception as any).error);
  }
}
