import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ProveedorEntity } from '../entities/proveedor.entity';
import { CreateProveedorDto } from '../dto/create-proveedor.dto';
import { UpdateProveedorDto } from '../dto/update-proveedor.dto';
import { FilterProveedoresDto } from '../dto/filter-proveedores.dto';

@Injectable()
export class ProveedoresRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: FilterProveedoresDto = {}): Promise<ProveedorEntity[]> {
    const where: any = {};
    if (options.activo !== undefined) where.activo = options.activo;
    if (options.search) {
      where.OR = [
        { nombre: { contains: options.search, mode: 'insensitive' } },
        { razon_social: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.proveedores.findMany({ where, orderBy: { nombre: 'asc' } });
  }

  async findById(id: string): Promise<ProveedorEntity | null> {
    return this.prisma.proveedores.findUnique({ where: { id } });
  }

  async findByCuit(cuit: string): Promise<ProveedorEntity | null> {
    return this.prisma.proveedores.findFirst({ where: { cuit } });
  }

  async search(query: string): Promise<ProveedorEntity[]> {
    return this.prisma.proveedores.findMany({
      where: {
        OR: [
          { nombre: { contains: query, mode: 'insensitive' } },
          { razon_social: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async create(data: CreateProveedorDto): Promise<ProveedorEntity> {
    if (data.cuit) {
      const existing = await this.findByCuit(data.cuit);
      if (existing) throw new BadRequestException('El CUIT ya existe');
    }
    return this.prisma.proveedores.create({ data });
  }

  async update(id: string, data: UpdateProveedorDto): Promise<ProveedorEntity> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException('Proveedor no encontrado');
    if (data.cuit && data.cuit !== existing.cuit) {
      const existingCuit = await this.findByCuit(data.cuit);
      if (existingCuit && existingCuit.id !== id) {
        throw new BadRequestException('El CUIT ya existe');
      }
    }
    return this.prisma.proveedores.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<ProveedorEntity> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException('Proveedor no encontrado');
    return this.prisma.proveedores.update({ where: { id }, data: { activo: false } });
  }
}