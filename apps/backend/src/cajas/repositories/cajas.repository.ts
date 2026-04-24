import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Caja } from '../entities/caja.entity';
import { CreateCajaDto } from '../dto/create-caja.dto';
import { UpdateCajaDto } from '../dto/update-caja.dto';
import { FilterCajasDto } from '../dto/filter-cajas.dto';

export interface ICajasRepository {
  findAll(filters: FilterCajasDto): Promise<Caja[]>;
  findById(id: string): Promise<Caja | null>;
  findByNumero(numero: number): Promise<Caja | null>;
  create(data: CreateCajaDto): Promise<Caja>;
  update(id: string, data: UpdateCajaDto): Promise<Caja>;
  softDelete(id: string): Promise<void>;
}

@Injectable()
export class CajasRepository implements ICajasRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: FilterCajasDto): Promise<Caja[]> {
    return this.prisma.cajas.findMany({
      where: { activo: filters?.activo ?? true },
      orderBy: { numero: 'asc' },
    });
  }

  async findById(id: string): Promise<Caja | null> {
    return this.prisma.cajas.findUnique({
      where: { id },
    });
  }

  async findByNumero(numero: number): Promise<Caja | null> {
    return this.prisma.cajas.findUnique({
      where: { numero },
    });
  }

  async create(data: CreateCajaDto): Promise<Caja> {
    // Validate numero uniqueness
    const exists = await this.findByNumero(data.numero);
    if (exists) {
      throw new ConflictException('Número de caja ya existe');
    }

    return this.prisma.cajas.create({ data });
  }

  async update(id: string, data: UpdateCajaDto): Promise<Caja> {
    const caja = await this.findById(id);
    if (!caja) {
      throw new NotFoundException('Caja no encontrada');
    }

    // If changing numero, validate uniqueness
    if (data.numero && data.numero !== caja.numero) {
      const duplicate = await this.findByNumero(data.numero);
      if (duplicate) {
        throw new ConflictException('Número ya existe');
      }
    }

    return this.prisma.cajas.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
    });
  }

  async softDelete(id: string): Promise<void> {
    const caja = await this.findById(id);
    if (!caja) {
      throw new NotFoundException('Caja no encontrada');
    }

    // Validate no ventas today
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const ventasHoy = await this.prisma.ventas.count({
      where: {
        caja_id: id,
        fecha: { gte: hoy, lt: manana },
      },
    });

    if (ventasHoy > 0) {
      throw new ConflictException('No se puede desactivar: tiene ventas del día');
    }

    await this.prisma.cajas.update({
      where: { id },
      data: { activo: false, updated_at: new Date() },
    });
  }
}
