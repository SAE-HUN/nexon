import { Controller, Get, Post, Body, UsePipes, ValidationPipe, UseGuards, Request, Param, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { ChangeUserRoleDto } from './dto/change-user-role.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  getHello(): string {
    return this.authService.getHello();
  }

  /**
   * User sign up endpoint
   */
  @Post('signup')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async signUp(@Body() createUserDto: CreateUserDto) {
    return await this.authService.createUser(createUserDto);
  }

  /**
   * User login endpoint
   */
  @Post('login')
  @UseGuards(AuthGuard('local'))
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async login(@Body() loginDto: LoginDto, @Request() req) {
    // req.user는 LocalStrategy의 validate에서 반환된 user 객체
    return this.authService.signToken(req.user);
  }

  /**
   * ADMIN이 타 유저의 role을 변경하는 엔드포인트
   */
  @Patch('users/:userId/role')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async changeUserRole(
    @Param('userId') userId: string,
    @Body() changeUserRoleDto: ChangeUserRoleDto
  ) {
    return this.authService.changeUserRole(userId, changeUserRoleDto);
  }
}
