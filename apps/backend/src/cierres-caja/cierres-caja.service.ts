import {
  ConflictException,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { CreateCierreCajaDto } from './dto/create-cierre-caja.dto';
import { FilterCierresCajaDto } from './dto/filter-cierres-caja.dto';
import { CierresCajaRepository } from './repositories/cierres-caja.repository';
import { PrismaService } from '../database/prisma.service';
import { EventBus } from '@nestjs/cqrs';
import { CierreCajaCreatedEvent } from './events/cierre-caja-created.event';
import { DiferenciaEfectivoDetectedEvent } from './events/diferencia-efectivo-detected.event';
import { CierreCaja } from './entities/cierre-caja.entity';

export interface TotalesCajaDto {
  total_efectivo: number;
  total_debito: number;
  total_credito: number;
  total_transferencia: number;
  total_qr: number;
  total_ventas: number;
  efectivo_sistema: number;
  total_gastos: number;
  total_retiros: number;
}

@Injectable()
export class CierresCajaService {
  constructor(
    private readonly repository: CierresCajaRepository,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) {}

  async calcularTotalesDia(
    cajaId: string,
    fecha: Date,
  ): Promise<TotalesCajaDto> {
    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fechaInicio);
    fechaFin.setDate(fechaFin.getDate() + 1);

    // STEP 1: Obtener ventas del día (NO anuladas)
    const ventas = await this.prisma.ventas.findMany({
      where: {
        caja_id: cajaId,
        fecha: { gte: fechaInicio, lt: fechaFin },
        anulada: false,
      },
      include: {
        medios_pago_venta: true,
      },
    });

    // STEP 2: Calcular totales por medio de pago
    let totalEfectivo = 0;
    let totalDebito = 0;
    let totalCredito = 0;
    let totalTransferencia = 0;
    let totalQr = 0;

    for (const venta of ventas) {
      for (const mp of venta.medios_pago_venta) {
        const monto = Number(mp.monto);
        switch (mp.medio_pago) {
          case 'efectivo':
            totalEfectivo += monto;
            break;
          case 'debito':
            totalDebito += monto;
            break;
          case 'credito':
            totalCredito += monto;
            break;
          case 'transferencia':
            totalTransferencia += monto;
            break;
          case 'qr':
            totalQr += monto;
            break;
        }
      }
    }

    // STEP 3: Obtener movimientos de caja (gastos y retiros)
    const movimientos = await this.prisma.movimientos_caja.findMany({
      where: {
        fecha: { gte: fechaInicio, lt: fechaFin },
      },
    });

    const totalGastos = movimientos
      .filter((m) => m.tipo === 'gasto')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    const totalRetiros = movimientos
      .filter((m) => m.tipo === 'retiro')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    // STEP 4: Calcular efectivo_sistema
    const efectivoSistema = totalEfectivo - totalGastos - totalRetiros;

    // STEP 5: Calcular total_ventas
    const totalVentas = ventas.reduce((sum, v) => sum + Number(v.total), 0);

    return {
      total_efectivo: totalEfectivo,
      total_debito: totalDebito,
      total_credito: totalCredito,
      total_transferencia: totalTransferencia,
      total_qr: totalQr,
      total_ventas: totalVentas,
      efectivo_sistema: efectivoSistema,
      total_gastos: totalGastos,
      total_retiros: totalRetiros,
    };
  }

  async createCierre(
    dto: CreateCierreCajaDto,
    userId: string,
  ): Promise<CierreCaja> {
    return this.prisma.$transaction(
      async (tx) => {
        // STEP 1: Validar que no exista cierre para esa caja y fecha
        const existingCierre = await this.repository.findByCajaAndFecha(
          dto.caja_id,
          new Date(dto.fecha),
        );

        if (existingCierre) {
          throw new ConflictException(
            'Ya existe cierre para esta caja y fecha',
          );
        }

        // STEP 2: Calcular totales del día
        const totales = await this.calcularTotalesDia(
          dto.caja_id,
          new Date(dto.fecha),
        );

        // STEP 3: Calcular diferencia efectivo
        const diferenciaEfectivo = dto.efectivo_fisico - totales.efectivo_sistema;

        // STEP 4: Validar motivo si diferencia != 0
        if (diferenciaEfectivo !== 0 && !dto.motivo_diferencia) {
          throw new BadRequestException(
            `Diferencia de efectivo detectada ($${diferenciaEfectivo}). Debe proporcionar motivo.`,
          );
        }

        // STEP 5: Crear cierre
        const cierre = await this.repository.create(
          {
            caja_id: dto.caja_id,
            fecha: new Date(dto.fecha),
            total_efectivo: totales.total_efectivo,
            total_debito: totales.total_debito,
            total_credito: totales.total_credito,
            total_transferencia: totales.total_transferencia,
            total_qr: totales.total_qr,
            total_ventas: totales.total_ventas,
            efectivo_sistema: totales.efectivo_sistema,
            efectivo_fisico: dto.efectivo_fisico,
            diferencia_efectivo: diferenciaEfectivo,
            motivo_diferencia: dto.motivo_diferencia || null,
            usuario_id: userId,
            observaciones: dto.observaciones || null,
          },
          tx,
        );

        // STEP 6: Emitir eventos
        await this.eventBus.publish(new CierreCajaCreatedEvent(cierre.id));

        if (diferenciaEfectivo !== 0) {
          await this.eventBus.publish(
            new DiferenciaEfectivoDetectedEvent(cierre.id, diferenciaEfectivo),
          );
        }

        return cierre;
      },
      {
        isolationLevel: 'ReadCommitted',
        timeout: 5000,
      },
    );
  }

  async findAll(filters: FilterCierresCajaDto): Promise<CierreCaja[]> {
    return this.repository.findAll(filters);
  }

  async findById(id: string): Promise<CierreCaja | null> {
    return this.repository.findById(id);
  }
}
