import { Injectable, NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { RubrosRepository } from './repositories/rubros.repository';
import { RubroEntity } from './entities/rubro.entity';
import { CreateRubroDto } from './dto/create-rubro.dto';
import { UpdateRubroDto, FilterRubrosDto } from './dto/update-rubro.dto';
import {
  CategoryCreatedEvent,
  CategoryUpdatedEvent,
  CategoryDeletedEvent,
} from '../shared/events';

@Injectable()
export class RubrosService {
  constructor(
    private readonly repository: RubrosRepository,
    private readonly eventBus: EventBus,
  ) {}

  async findAll(filters: FilterRubrosDto = {}): Promise<RubroEntity[]> {
    return this.repository.findAll(filters);
  }

  async findById(id: string): Promise<RubroEntity> {
    const entity = await this.repository.findById(id);
    if (!entity) throw new NotFoundException(`Rubro con ID ${id} no encontrado`);
    return entity;
  }

  async findChildren(id: string): Promise<RubroEntity[]> {
    return this.repository.findChildren(id);
  }

  async findTree(): Promise<RubroEntity[]> {
    return this.repository.findTree();
  }

  async create(data: CreateRubroDto): Promise<RubroEntity> {
    const rubro = await this.repository.create(data);
    
    // Emit event for sync module
    this.eventBus.publish(
      new CategoryCreatedEvent(rubro.id, rubro.nombre, rubro.descripcion),
    );

    return rubro;
  }

  async update(id: string, data: UpdateRubroDto): Promise<RubroEntity> {
    const rubro = await this.repository.update(id, data);

    // Emit event for sync module
    this.eventBus.publish(
      new CategoryUpdatedEvent(rubro.id, {
        name: rubro.nombre,
        description: rubro.descripcion,
      }),
    );

    return rubro;
  }

  async softDelete(id: string): Promise<RubroEntity> {
    const rubro = await this.repository.softDelete(id);

    // Emit event for sync module
    this.eventBus.publish(new CategoryDeletedEvent(rubro.id, rubro.nombre));

    return rubro;
  }
}