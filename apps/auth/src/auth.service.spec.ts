import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { UserRole } from './enum/user-role.enum';

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: any;
  let jwtService: any;

  beforeEach(async () => {
    authRepository = {
      existsByEmail: jest.fn(),
      createUser: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };
    jwtService = { sign: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: authRepository },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  describe('createUser', () => {
    it('should create user if email not exists', async () => {
      authRepository.existsByEmail.mockResolvedValue(false);
      const user = { id: 'id', email: 'a@a.com', role: UserRole.USER };
      authRepository.createUser.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed');
      const dto = { email: 'a@a.com', password: 'pw123456' };
      const result = await service.createUser(dto);
      expect(result).toEqual({
        id: 'id',
        email: 'a@a.com',
        role: UserRole.USER,
      });
    });
    it('should throw if email exists', async () => {
      authRepository.existsByEmail.mockResolvedValue(true);
      const dto = { email: 'a@a.com', password: 'pw123456' };
      await expect(service.createUser(dto)).rejects.toMatchObject({
        message: 'Email already exists',
      });
    });
  });

  describe('login', () => {
    it('should return access_token if credentials are valid', async () => {
      const user = {
        id: 'id',
        email: 'a@a.com',
        password: 'hashed',
        role: UserRole.USER,
      };
      authRepository.findByEmail.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      jwtService.sign.mockReturnValue('token');
      const dto = { email: 'a@a.com', password: 'pw123456' };
      const result = await service.login(dto);
      expect(result).toEqual({ access_token: 'token' });
    });
    it('should throw if user not found', async () => {
      authRepository.findByEmail.mockResolvedValue(null);
      const dto = { email: 'a@a.com', password: 'pw123456' };
      await expect(service.login(dto)).rejects.toMatchObject({
        message: 'Invalid email or password.',
      });
    });
    it('should throw if password is invalid', async () => {
      const user = {
        id: 'id',
        email: 'a@a.com',
        password: 'hashed',
        role: UserRole.USER,
      };
      authRepository.findByEmail.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
      const dto = { email: 'a@a.com', password: 'pw123456' };
      await expect(service.login(dto)).rejects.toMatchObject({
        message: 'Invalid email or password.',
      });
    });
  });

  describe('changeUserRole', () => {
    it('should change user role if user exists and role is different', async () => {
      const user = {
        id: 'id',
        email: 'a@a.com',
        password: 'hashed',
        role: UserRole.USER,
        save: jest.fn().mockResolvedValue(undefined),
      };
      authRepository.findById.mockResolvedValue(user);
      const dto = { userId: 'id', role: UserRole.ADMIN };
      const result = await service.changeUserRole(dto);
      expect(result).toEqual({
        id: 'id',
        email: 'a@a.com',
        role: UserRole.ADMIN,
      });
    });
    it('should throw if user does not exist', async () => {
      authRepository.findById.mockResolvedValue(null);
      const dto = { userId: 'id', role: UserRole.ADMIN };
      await expect(service.changeUserRole(dto)).rejects.toMatchObject({
        message: 'User does not exist.',
      });
    });
    it('should throw if user already has role', async () => {
      const user = {
        id: 'id',
        email: 'a@a.com',
        password: 'hashed',
        role: UserRole.ADMIN,
        save: jest.fn(),
      };
      authRepository.findById.mockResolvedValue(user);
      const dto = { userId: 'id', role: UserRole.ADMIN };
      await expect(service.changeUserRole(dto)).rejects.toMatchObject({
        message: 'Already has role.',
      });
    });
  });
});
