import { SetMetadata } from '@nestjs/common';

/**
 * Custom decorator to specify required roles for route handlers or controllers.
 * @param roles List of allowed roles
 * @returns Metadata for roles
 */
export const Roles = (...roles: string[]): any => SetMetadata('roles', roles); 