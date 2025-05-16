import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ChangeUserRoleDto } from './dto/change-user-role.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  
  @MessagePattern({ cmd: 'auth_signup' })
  async signUp(@Payload() createUserDto: CreateUserDto) {
    return this.authService.createUser(createUserDto);
  }

  @MessagePattern({ cmd: 'auth_login' })
  async login(@Payload() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @MessagePattern({ cmd: 'auth_change_role' })
  async changeUserRole(@Payload() changeUserRoleDto: ChangeUserRoleDto) {
    return this.authService.changeUserRole(changeUserRoleDto);
  }
}
