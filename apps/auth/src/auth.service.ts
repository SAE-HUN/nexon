import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserRole } from './user.schema';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
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

  getHello(): string {
    return 'Hello World!';
  }
}
