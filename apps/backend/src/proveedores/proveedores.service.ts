import { Injectable, NotFoundException } from '@nestjs/common';
import { ProveedoresRepository } from './repositories/proveedores.repository';
import { ProveedorEntity } from './entities/proveedor.entity';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { FilterProveedoresDto } from './dto/filter-proveedores.dto';

@Injectable()
export class ProveedoresService {
  constructor(private readonly repository: ProveedoresRepository) {}

  async findAll(filters: FilterProveedoresDto = {}): Promise<ProveedorEntity[]> {
    return this.repository.findAll(filters);
  }

  async findById(id: string): Promise<ProveedorEntity> {
    const entity = await this.repository.findById(id);
    if (!entity) throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    return entity;
  }

  async search(query: string): Promise<ProveedorEntity[]> {
    return this.repository.search(query);
  }

  async create(data: CreateProveedorDto): Promise<ProveedorEntity> {
    return this.repository.create(data);
  }

  async update(id: string, data: UpdateProveedorDto): Promise<ProveedorEntity> {
    return this.repository.update(id, data);
  }

  async softDelete(id: string): Promise<ProveedorEntity> {
    return this.repository.softDelete(id);
  }
}