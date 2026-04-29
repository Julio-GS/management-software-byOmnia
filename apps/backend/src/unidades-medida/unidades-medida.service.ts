import { Injectable, NotFoundException } from '@nestjs/common';
import { UnidadesMedidaRepository } from './repositories/unidades-medida.repository';
import { UnidadMedidaEntity } from './entities/unidad-medida.entity';
import { CreateUnidadMedidaDto } from './dto/create-unidad-medida.dto';
import { UpdateUnidadMedidaDto } from './dto/update-unidad-medida.dto';
import { FilterUnidadesMedidaDto } from './dto/filter-unidades-medida.dto';

@Injectable()
export class UnidadesMedidaService {
  constructor(private readonly repository: UnidadesMedidaRepository) {}

  async findAll(filters: FilterUnidadesMedidaDto = {}): Promise<UnidadMedidaEntity[]> {
    return this.repository.findAll(filters);
  }

  async findById(id: string): Promise<UnidadMedidaEntity> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException(`Unidad de medida con ID ${id} no encontrada`);
    }
    return entity;
  }

  async create(data: CreateUnidadMedidaDto): Promise<UnidadMedidaEntity> {
    return this.repository.create(data);
  }

  async update(id: string, data: UpdateUnidadMedidaDto): Promise<UnidadMedidaEntity> {
    return this.repository.update(id, data);
  }

  async softDelete(id: string): Promise<UnidadMedidaEntity> {
    return this.repository.softDelete(id);
  }
}