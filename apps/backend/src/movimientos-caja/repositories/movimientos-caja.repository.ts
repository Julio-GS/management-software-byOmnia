import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMovimientoCajaDto } from '../dto/create-movimiento-caja.dto';
import { FilterMovimientosCajaDto } from '../dto/filter-movimientos-caja.dto';
import { MovimientoCaja } from '../entities/movimiento-caja.entity';
import { Prisma } from '@prisma/client';

export interface IMovimientosCajaRepository {
  findAll(
    filters: FilterMovimientosCajaDto,
  ): Promise<{ data: MovimientoCaja[]; total: number }>;
  findById(id: string): Promise<MovimientoCaja | null>;
  findByFecha(desde: Date, hasta: Date): Promise<MovimientoCaja[]>;
  create(dto: CreateMovimientoCajaDto, userId: string): Promise<MovimientoCaja>;
}

@Injectable()
export class MovimientosCajaRepository implements IMovimientosCajaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    filters: FilterMovimientosCajaDto,
  ): Promise<{ data: MovimientoCaja[]; total: number }> {
    const where: Prisma.movimientos_cajaWhereInput = {
      tipo: filters.tipo,
      fecha: {
        gte: filters.fecha_desde ? new Date(filters.fecha_desde) : undefined,
        lte: filters.fecha_hasta ? new Date(filters.fecha_hasta) : undefined,
      },
    };

    const [data, total] = await Promise.all([
      this.prisma.movimientos_caja.findMany({
        where,
        skip: ((filters.page ?? 1) - 1) * (filters.limit ?? 20),
        take: filters.limit ?? 20,
        orderBy: { fecha: 'desc' },
        include: {
          usuarios: {
            select: {
              username: true,
            },
          },
        },
      }),
      this.prisma.movimientos_caja.count({ where }),
    ]);

    return {
      data: data as any,
      total,
    };
  }

  async findById(id: string): Promise<MovimientoCaja | null> {
    const result = await this.prisma.movimientos_caja.findUnique({
      where: { id },
      include: {
        usuarios: {
          select: {
            username: true,
          },
        },
      },
    });

    return result as any;
  }

  async findByFecha(desde: Date, hasta: Date): Promise<MovimientoCaja[]> {
    const result = await this.prisma.movimientos_caja.findMany({
      where: {
        fecha: {
          gte: desde,
          lte: hasta,
        },
      },
      orderBy: { fecha: 'asc' },
    });

    return result as any;
  }

  async create(
    dto: CreateMovimientoCajaDto,
    userId: string,
  ): Promise<MovimientoCaja> {
    const result = await this.prisma.movimientos_caja.create({
      data: {
        tipo: dto.tipo,
        monto: dto.monto,
        concepto: dto.concepto,
        comprobante: dto.comprobante,
        observaciones: dto.observaciones,
        usuario_id: userId,
      },
    });

    return result as any;
  }
}
