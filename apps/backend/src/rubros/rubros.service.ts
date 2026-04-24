import { Injectable, NotFoundException } from '@nestjs/common';
import { RubrosRepository } from './repositories/rubros.repository';
import { RubroEntity } from './entities/rubro.entity';
import { CreateRubroDto } from './dto/create-rubro.dto';
import { UpdateRubroDto, FilterRubrosDto } from './dto/update-rubro.dto';

@Injectable()
export class RubrosService {
  constructor(private readonly repository: RubrosRepository) {}

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
    return this.repository.create(data);
  }

  async update(id: string, data: UpdateRubroDto): Promise<RubroEntity> {
    return this.repository.update(id, data);
  }

  async softDelete(id: string): Promise<RubroEntity> {
    return this.repository.softDelete(id);
  }
}