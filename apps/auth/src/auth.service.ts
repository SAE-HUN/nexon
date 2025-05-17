import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schema/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
import { ChangeUserRoleDto } from './dto/change-user-role.dto';
import { LoginDto } from './dto/login.dto';
import { RpcException } from '@nestjs/microservices';
import { UserRole } from './enum/user-role.enum';
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
  async createUser(dto: CreateUserDto): Promise<User> {
    const { email, password } = dto;
    const existing = await this.userModel.findOne({ email });
    if (existing) {
      throw new RpcException({ message: 'Email already exists' });
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
      throw new RpcException('Failed to create user');
    }
  }

  /**
   * Validates user credentials and issues a JWT token if valid.
   * @param loginDto - Login DTO containing email and password
   * @returns An object containing the access token
   */
  async login(dto: LoginDto): Promise<{ access_token: string }> {
    const { email, password } = dto;
    const user = await this.userModel.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new RpcException('Invalid email or password.');
    }
    const payload: { sub: string; email: string; role: string } = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  /**
   * ADMIN이 타 유저의 role을 변경하는 메서드
   */
  async changeUserRole(dto: ChangeUserRoleDto): Promise<UserDocument> {
    const { userId, role } = dto;
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new RpcException('존재하지 않는 유저입니다.');
    }
    if (user.role === role) {
      throw new RpcException('이미 해당 role입니다.');
    }
    user.role = role;
    await user.save();
    return user;
  }
}
