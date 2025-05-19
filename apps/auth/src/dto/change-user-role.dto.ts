import { IsEnum, IsString } from 'class-validator';
import { UserRole } from '../enum/user-role.enum';

export class ChangeUserRoleDto {
  @IsString()
  userId: string;

  @IsEnum(UserRole)
  role: UserRole;
}