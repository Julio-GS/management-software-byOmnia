import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    // Check if username already exists
    const existingUser = await this.prisma.usuarios.findUnique({
      where: { username: createUserDto.username },
    });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create user
    const user = await this.prisma.usuarios.create({
      data: {
        username: createUserDto.username,
        email: createUserDto.email,
        password_hash: hashedPassword,
        rol: createUserDto.role || 'cajero',
        nombre_completo: createUserDto.firstName && createUserDto.lastName ? `${createUserDto.firstName} ${createUserDto.lastName}` : null,
      },
    });

    return new UserEntity(user as any);
  }

  async findAll(): Promise<UserEntity[]> {
    const users = await this.prisma.usuarios.findMany({
      orderBy: { created_at: 'desc' },
    });

    return users.map((user) => new UserEntity(user as any));
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.prisma.usuarios.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return new UserEntity(user as any);
  }

  // This method returns user WITH password for authentication
  async findByUsernameWithPassword(username: string) {
    return this.prisma.usuarios.findUnique({
      where: { username },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    const existingUser = await this.prisma.usuarios.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Update user
    const data: any = {};
    if (updateUserDto.email) data.email = updateUserDto.email;
    if (updateUserDto.role) data.rol = updateUserDto.role;
    if (updateUserDto.isActive !== undefined) data.activo = updateUserDto.isActive;
    if (updateUserDto.firstName || updateUserDto.lastName) {
       // It's a simplistic merge
       data.nombre_completo = `${updateUserDto.firstName || ''} ${updateUserDto.lastName || ''}`.trim();
    }

    const user = await this.prisma.usuarios.update({
      where: { id },
      data,
    });

    return new UserEntity(user as any);
  }

  async remove(id: string): Promise<void> {
    const user = await this.prisma.usuarios.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.rol === 'admin') {
      const adminCount = await this.prisma.usuarios.count({
        where: { rol: 'admin', activo: true },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('Cannot delete the last active admin user');
      }
    }

    // Soft delete
    await this.prisma.usuarios.update({
      where: { id },
      data: { activo: false },
    });
  }
}
