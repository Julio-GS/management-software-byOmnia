import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PullResponseDto } from '../dto/pull-response.dto';

@Injectable()
export class PullService {
  constructor(private readonly prisma: PrismaService) {}

  async pullChanges(sinceStr?: string): Promise<PullResponseDto> {
    const since = sinceStr ? new Date(sinceStr) : new Date(0);
    const now = new Date();

    // Solo pedimos las entidades maestras que manejan updated_at
    const [
      productos,
      rubros,
      proveedores,
      lotes,
      promociones,
      unidades_medida,
      stock_snapshot
    ] = await Promise.all([
      this.prisma.productos.findMany({ where: { updated_at: { gt: since } } }),
      this.prisma.rubros.findMany({ where: { updated_at: { gt: since } } }),
      this.prisma.proveedores.findMany({ where: { updated_at: { gt: since } } }),
      
      // Entidades que por ahora no tienen updated_at o se requiere enviar todo lo activo
      this.prisma.lotes.findMany({ where: { activo: true, cantidad_actual: { gt: 0 } } }),
      this.prisma.promociones.findMany({ where: { activo: true } }),
      this.prisma.unidades_medida.findMany(),

      // Snapshot crudo de stock actual para corregir cualquier desviación
      this.prisma.$queryRaw`SELECT producto_id, stock_total FROM v_stock_actual`
    ]);

    return {
      timestamp: now,
      productos,
      lotes,
      promociones,
      rubros,
      categorias: [], // Reservado
      unidades_medida,
      proveedores,
      stock_snapshot: stock_snapshot as any[],
    };
  }
}
