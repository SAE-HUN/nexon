import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

/**
 * Guard for role-based access control.
 * Checks if the user has one of the required roles set by the @Roles decorator.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  /**
   * @param reflector Used to retrieve metadata set by decorators
   */
  constructor(private readonly reflector: Reflector) {}

  /**
   * Determines if the current user has the required role(s).
   * @param context ExecutionContext provided by NestJS
   * @returns true if user has required role, otherwise throws ForbiddenException
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('You do not have permission (roles)');
    }
    return true;
  }
}
