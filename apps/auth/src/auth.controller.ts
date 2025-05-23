import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { ChangeUserRoleDto } from './dto/change-user-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern({ cmd: 'auth.hello' })
  async getHello() {
    return 'Hello, World!';
  }

  @MessagePattern({ cmd: 'auth.user.signup' })
  async signUp(@Payload() dto: CreateUserDto) {
    return this.authService.createUser(dto);
  }

  @MessagePattern({ cmd: 'auth.user.login' })
  async login(@Payload() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @MessagePattern({ cmd: 'auth.user.change-role' })
  async changeUserRole(@Payload() dto: ChangeUserRoleDto) {
    return this.authService.changeUserRole(dto);
  }
}
