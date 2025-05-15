import { Controller, Get, Post, Body, UsePipes, ValidationPipe, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';

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
}
