import { Injectable, NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { CajasRepository } from './repositories/cajas.repository';
import { CreateCajaDto } from './dto/create-caja.dto';
import { UpdateCajaDto } from './dto/update-caja.dto';
import { FilterCajasDto } from './dto/filter-cajas.dto';
import { Caja } from './entities/caja.entity';
import { CajaCreatedEvent, CajaUpdatedEvent, CajaDeletedEvent } from './events';

@Injectable()
export class CajasService {
  constructor(
    private readonly repository: CajasRepository,
    private readonly eventBus: EventBus,
  ) {}

  async create(dto: CreateCajaDto): Promise<Caja> {
    const caja = await this.repository.create(dto);
    
    this.eventBus.publish(
      new CajaCreatedEvent(caja.id, caja.numero, caja.nombre),
    );

    return caja;
  }

  async findAll(filters: FilterCajasDto): Promise<Caja[]> {
    return this.repository.findAll(filters);
  }

  async findById(id: string): Promise<Caja> {
    const caja = await this.repository.findById(id);
    if (!caja) {
      throw new NotFoundException('Caja no encontrada');
    }
    return caja;
  }

  async update(id: string, dto: UpdateCajaDto): Promise<Caja> {
    const caja = await this.repository.update(id, dto);
    
    this.eventBus.publish(new CajaUpdatedEvent(caja.id, dto));

    return caja;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
    
    this.eventBus.publish(new CajaDeletedEvent(id));
  }
}
