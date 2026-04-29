import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import { instanceToPlain } from 'class-transformer';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    usuarios: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockUser = {
    id: 'user-id-123',
    username: 'testuser',
    email: 'test@example.com',
    password_hash: 'hashedPassword123',
    nombre_completo: 'Test User',
    rol: 'cajero',
    activo: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a user when found by ID', async () => {
      mockPrismaService.usuarios.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('user-id-123');

      expect(result).toBeDefined();
      expect(result.username).toBe('testuser');
      
      // Password should be excluded when serialized
      const serialized = instanceToPlain(result);
      expect(serialized.password_hash).toBeUndefined();
      
      expect(mockPrismaService.usuarios.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
      });
    });
  });

  describe('findByUsernameWithPassword', () => {
    it('should return user with password when found by username', async () => {
      mockPrismaService.usuarios.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByUsernameWithPassword('testuser');

      expect(result).toBeDefined();
      expect(result.username).toBe('testuser');
      expect(result.password_hash).toBe('hashedPassword123'); // Password should be included
      expect(mockPrismaService.usuarios.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('should return null when user not found by username', async () => {
      mockPrismaService.usuarios.findUnique.mockResolvedValue(null);

      const result = await service.findByUsernameWithPassword('nonexistent');

      expect(result).toBeNull();
      expect(mockPrismaService.usuarios.findUnique).toHaveBeenCalledWith({
        where: { username: 'nonexistent' },
      });
    });
  });

});
