import { IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../enum/user-role.enum';

export class ChangeUserRoleDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsEnum(UserRole)
  role: UserRole;
}