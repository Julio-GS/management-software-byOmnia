import { Injectable, NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { MovimientosCajaRepository } from './repositories/movimientos-caja.repository';
import { CreateMovimientoCajaDto } from './dto/create-movimiento-caja.dto';
import { FilterMovimientosCajaDto } from './dto/filter-movimientos-caja.dto';
import { MovimientoCaja } from './entities/movimiento-caja.entity';
import { MovimientoCajaCreatedEvent } from './events/movimiento-caja-created.event';

@Injectable()
export class MovimientosCajaService {
  constructor(
    private readonly repository: MovimientosCajaRepository,
    private readonly eventBus: EventBus,
  ) {}

  async create(
    dto: CreateMovimientoCajaDto,
    userId: string,
  ): Promise<MovimientoCaja> {
    const movimiento = await this.repository.create(dto, userId);

    // Emit domain event for auditing and reporting
    this.eventBus.publish(
      new MovimientoCajaCreatedEvent(
        movimiento.id,
        movimiento.tipo,
        Number(movimiento.monto),
        movimiento.concepto,
        movimiento.usuario_id,
        movimiento.fecha,
      ),
    );

    return movimiento;
  }

  async findAll(
    filters: FilterMovimientosCajaDto,
  ): Promise<{ data: MovimientoCaja[]; total: number }> {
    return this.repository.findAll(filters);
  }

  async findOne(id: string): Promise<MovimientoCaja> {
    const movimiento = await this.repository.findById(id);

    if (!movimiento) {
      throw new NotFoundException(
        `Movimiento de caja con ID ${id} no encontrado`,
      );
    }

    return movimiento;
  }

  async findByFecha(desde: Date, hasta: Date): Promise<MovimientoCaja[]> {
    return this.repository.findByFecha(desde, hasta);
  }
}
