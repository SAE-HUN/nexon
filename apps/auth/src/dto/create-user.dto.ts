import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * DTO for user sign up request
 */
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
} 