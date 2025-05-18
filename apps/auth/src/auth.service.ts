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

  async createUser(dto: CreateUserDto) {
    const { email, password } = dto;
    const existing = await this.userModel.exists({ email });
    if (existing) {
      throw new RpcException({ message: 'Email already exists', status: 400 });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new this.userModel({
      email,
      password: hashedPassword,
    role: UserRole.USER,
    });
    await user.save();
    return { id: user.id, email: user.email, role: user.role };
  }
  
  async login(dto: LoginDto): Promise<{ access_token: string }> {
    const { email, password } = dto;
    const user = await this.userModel.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new RpcException({ message: 'Invalid email or password.', status: 401 });
    }
    const payload: { sub: string; email: string; role: string } = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
  
  async changeUserRole(dto: ChangeUserRoleDto) {
    const { userId, role } = dto;
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new RpcException({ message: 'User does not exist.', status: 400 });
    }
    if (user.role === role) {
      throw new RpcException({ message: 'Already has role.', status: 400 });
    }
    user.role = role;
    await user.save();
    return { id: user.id, email: user.email, role: user.role };
  }
}
