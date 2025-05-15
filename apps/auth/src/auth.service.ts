import { Injectable, ConflictException, InternalServerErrorException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserRole } from './user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
import { ChangeUserRoleDto } from './dto/change-user-role.dto';
import { LoginDto } from './dto/login.dto';


@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Create a new user (sign up)
   * @param createUserDto
   */
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const { email, password } = createUserDto;
    const existing = await this.userModel.findOne({ email });
    if (existing) {
      throw new ConflictException('Email already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const user = new this.userModel({
        email,
        password: hashedPassword,
        role: UserRole.USER,
      });
      return await user.save();
    } catch (err) {
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  /**
   * Validates user credentials and issues a JWT token if valid.
   * @param loginDto - Login DTO containing email and password
   * @returns An object containing the access token
   */
  async loginAndSignToken(loginDto: LoginDto): Promise<{ access_token: string }> {
    const { email, password } = loginDto;
    const user = await this.userModel.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    const payload: { sub: string; email: string; role: string } = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  /**
   * ADMIN이 타 유저의 role을 변경하는 메서드
   */
  async changeUserRole(userId: string, changeUserRoleDto: ChangeUserRoleDto): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('존재하지 않는 유저입니다.');
    }
    if (user.role === changeUserRoleDto.role) {
      throw new BadRequestException('이미 해당 role입니다.');
    }
    user.role = changeUserRoleDto.role;
    await user.save();
    return user;
  }

  getHello(): string {
    return 'Hello World!';
  }
}
