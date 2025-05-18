import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { throwError } from 'rxjs';

@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (!(exception instanceof RpcException)) {
      exception = new RpcException({ message: (exception as any).message || 'Internal server error', status: 500 });
    }
    return throwError(() => (exception as any).error);
  }
} 