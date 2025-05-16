import { IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../user.schema';

export class ChangeUserRoleDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsEnum(UserRole, { message: 'role 값은 UserRole enum 값만 허용됩니다.' })
  role: UserRole;
} 