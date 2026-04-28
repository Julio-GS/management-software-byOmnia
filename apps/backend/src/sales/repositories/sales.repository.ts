import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ISalesRepository } from './sales.repository.interface';

@Injectable()
export class SalesRepository implements ISalesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async executeTransaction<T>(fn: (tx: any) => Promise<T>, options?: any): Promise<T> {
    return this.prisma.$transaction(fn, options);
  }

  private getClient(tx?: any) {
    return tx || this.prisma;
  }

  async findCajaById(id: string, tx?: any): Promise<any> {
    return this.getClient(tx).cajas.findUnique({ where: { id } });
  }

  async findProductosActivos(ids: string[], tx?: any): Promise<any[]> {
    return this.getClient(tx).productos.findMany({
      where: { id: { in: ids }, activo: true },
      select: {
        id: true,
        detalle: true,
        codigo: true,
        precio_venta: true,
        requiere_precio_manual: true,
        maneja_lotes: true,
        maneja_stock: true,
        iva: true,
        activo: true,
      },
    });
  }

  async getStockDisponible(productoId: string, tx?: any): Promise<number> {
    const client = this.getClient(tx);
    const stockView = await client.$queryRaw`
      SELECT stock_total FROM v_stock_actual
      WHERE producto_id = ${productoId}::uuid
    `;
    return Number((stockView as any)[0]?.stock_total ?? 0);
  }

  async findLotesDisponibles(productoId: string, tx?: any): Promise<any[]> {
    return this.getClient(tx).lotes.findMany({
      where: {
        producto_id: productoId,
        activo: true,
        cantidad_actual: { gt: 0 },
      },
      orderBy: { fecha_vencimiento: 'asc' }, // FEFO
    });
  }

  async getUltimaVentaCajaByPrefix(cajaId: string, prefix: string, tx?: any): Promise<any> {
    return this.getClient(tx).ventas.findFirst({
      where: {
        caja_id: cajaId,
        numero_ticket: { startsWith: prefix },
      },
      orderBy: { numero_ticket: 'desc' },
    });
  }

  async crearVenta(data: any, tx?: any): Promise<any> {
    return this.getClient(tx).ventas.create({ data });
  }

  async crearDetallesVenta(data: any[], tx?: any): Promise<any> {
    return this.getClient(tx).detalle_ventas.createMany({ data });
  }

  async crearMediosPago(data: any[], tx?: any): Promise<any> {
    return this.getClient(tx).medios_pago_venta.createMany({ data });
  }

  async crearMovimientosStock(data: any[], tx?: any): Promise<any> {
    for (const mov of data) {
      await this.getClient(tx).movimientos_stock.create({ data: mov });
    }
  }

  async getVentaCompleta(id: string, tx?: any): Promise<any> {
    return this.getClient(tx).ventas.findUnique({
      where: { id },
      include: {
        detalle_ventas: {
          include: {
            productos: { select: { codigo: true, detalle: true } },
            lotes: { select: { numero_lote: true } },
            promociones: { select: { nombre: true } },
          },
        },
        medios_pago_venta: true,
        cajas: { select: { numero: true, nombre: true } },
        usuarios: { select: { username: true } },
      },
    });
  }

  async findAll(filters: any, skip: number, take: number): Promise<[any[], number]> {
    const where: any = {
      anulada: filters.incluir_anuladas ? undefined : false,
    };

    if (filters.caja_id) where.caja_id = filters.caja_id;
    if (filters.fecha_desde || filters.fecha_hasta) {
      where.fecha = {};
      if (filters.fecha_desde) where.fecha.gte = new Date(filters.fecha_desde);
      if (filters.fecha_hasta) where.fecha.lte = new Date(filters.fecha_hasta);
    }

    return Promise.all([
      this.prisma.ventas.findMany({
        where,
        skip,
        take,
        orderBy: { fecha: 'desc' },
        include: {
          cajas: { select: { numero: true, nombre: true } },
          usuarios: { select: { username: true } },
          _count: { select: { detalle_ventas: true, medios_pago_venta: true } },
        },
      }),
      this.prisma.ventas.count({ where }),
    ]);
  }

  async findOne(id: string): Promise<any> {
    return this.getVentaCompleta(id);
  }

  async findByNumeroTicket(numeroTicket: string): Promise<any> {
    return this.prisma.ventas.findFirst({
      where: { numero_ticket: numeroTicket },
      include: {
        detalle_ventas: {
          include: {
            productos: { select: { codigo: true, detalle: true } },
          },
        },
        medios_pago_venta: true,
      },
    });
  }

  async findByCajaHoy(cajaId: string, hoy: Date, manana: Date): Promise<any[]> {
    return this.prisma.ventas.findMany({
      where: {
        caja_id: cajaId,
        fecha: { gte: hoy, lt: manana },
        anulada: false,
      },
      orderBy: { fecha: 'desc' },
      include: {
        detalle_ventas: true,
        medios_pago_venta: true,
      },
    });
  }

  async anularVenta(id: string, motivo: string): Promise<any> {
    return this.prisma.ventas.update({
      where: { id },
      data: {
        anulada: true,
        motivo_anulacion: motivo,
        fecha_anulacion: new Date(),
      },
    });
  }
}
