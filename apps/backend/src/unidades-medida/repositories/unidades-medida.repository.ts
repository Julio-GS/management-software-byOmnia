import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UnidadMedidaEntity } from '../entities/unidad-medida.entity';
import { CreateUnidadMedidaDto } from '../dto/create-unidad-medida.dto';
import { UpdateUnidadMedidaDto } from '../dto/update-unidad-medida.dto';
import { FilterUnidadesMedidaDto } from '../dto/filter-unidades-medida.dto';

export interface FindAllOptions extends FilterUnidadesMedidaDto {}

@Injectable()
export class UnidadesMedidaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: FindAllOptions = {}): Promise<UnidadMedidaEntity[]> {
    const where: any = {};
    
    if (options.tipo) {
      where.tipo = options.tipo;
    }
    if (options.activo !== undefined) {
      where.activo = options.activo;
    }

    return this.prisma.unidades_medida.findMany({
      where,
      orderBy: { nombre: 'asc' },
    });
  }

  async findById(id: string): Promise<UnidadMedidaEntity | null> {
    return this.prisma.unidades_medida.findUnique({
      where: { id },
    });
  }

  async findByAbreviatura(abreviatura: string): Promise<UnidadMedidaEntity | null> {
    return this.prisma.unidades_medida.findFirst({
      where: { abreviatura },
    });
  }

  async create(data: CreateUnidadMedidaDto): Promise<UnidadMedidaEntity> {
    // Validate abreviatura unique
    const existing = await this.findByAbreviatura(data.abreviatura);
    if (existing) {
      throw new BadRequestException('La abreviatura ya existe');
    }

    return this.prisma.unidades_medida.create({
      data: {
        nombre: data.nombre,
        abreviatura: data.abreviatura,
        tipo: data.tipo,
      },
    });
  }

  async update(id: string, data: UpdateUnidadMedidaDto): Promise<UnidadMedidaEntity> {
    // Check exists
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException('Unidad de medida no encontrada');
    }

    // Validate abreviatura unique if changed
    if (data.abreviatura && data.abreviatura !== existing.abreviatura) {
      const existingAbreviatura = await this.findByAbreviatura(data.abreviatura);
      if (existingAbreviatura && existingAbreviatura.id !== id) {
        throw new BadRequestException('La abreviatura ya existe');
      }
    }

    return this.prisma.unidades_medida.update({
      where: { id },
      data: {
        nombre: data.nombre,
        abreviatura: data.abreviatura,
        tipo: data.tipo,
        activo: data.activo,
      },
    });
  }

  async softDelete(id: string): Promise<UnidadMedidaEntity> {
    // Check exists
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException('Unidad de medida no encontrada');
    }

    return this.prisma.unidades_medida.update({
      where: { id },
      data: { activo: false },
    });
  }
}