import { IsEnum } from 'class-validator';
import { UserRole } from '../user.schema';

export class ChangeUserRoleDto {
  @IsEnum(UserRole, { message: 'role 값은 UserRole enum 값만 허용됩니다.' })
  role: UserRole;
} 