import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CierreCaja } from '../entities/cierre-caja.entity';
import { FilterCierresCajaDto } from '../dto/filter-cierres-caja.dto';
import { Prisma } from '@prisma/client';

export interface CreateCierreCajaData {
  caja_id: string;
  fecha: Date;
  total_efectivo: number;
  total_debito: number;
  total_credito: number;
  total_transferencia: number;
  total_qr: number;
  total_ventas: number;
  efectivo_sistema: number;
  efectivo_fisico: number;
  diferencia_efectivo: number;
  motivo_diferencia: string | null;
  usuario_id: string;
  observaciones: string | null;
}

@Injectable()
export class CierresCajaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: FilterCierresCajaDto): Promise<CierreCaja[]> {
    const where: Prisma.CierresCajaWhereInput = {
      caja_id: filters.caja_id,
      fecha: filters.fecha
        ? new Date(filters.fecha)
        : {
            gte: filters.fecha_desde
              ? new Date(filters.fecha_desde)
              : undefined,
            lte: filters.fecha_hasta ? new Date(filters.fecha_hasta) : undefined,
          },
    };

    return this.prisma.cierres_caja.findMany({
      where,
      orderBy: { fecha: 'desc' },
      include: {
        cajas: { select: { numero: true, nombre: true } },
        usuarios: { select: { username: true } },
      },
    }) as unknown as CierreCaja[];
  }

  async findById(id: string): Promise<CierreCaja | null> {
    return this.prisma.cierres_caja.findUnique({
      where: { id },
      include: {
        cajas: { select: { numero: true, nombre: true } },
        usuarios: { select: { username: true } },
      },
    }) as unknown as CierreCaja | null;
  }

  async findByCajaAndFecha(
    cajaId: string,
    fecha: Date,
  ): Promise<CierreCaja | null> {
    const fechaSolo = new Date(fecha);
    fechaSolo.setHours(0, 0, 0, 0);

    return this.prisma.cierres_caja.findFirst({
      where: {
        caja_id: cajaId,
        fecha: fechaSolo,
      },
    }) as unknown as CierreCaja | null;
  }

  async create(
    data: CreateCierreCajaData,
    tx: Prisma.TransactionClient,
  ): Promise<CierreCaja> {
    return tx.cierres_caja.create({
      data,
    }) as unknown as CierreCaja;
  }
}
