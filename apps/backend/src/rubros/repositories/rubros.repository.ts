import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RubroEntity } from '../entities/rubro.entity';
import { CreateRubroDto } from '../dto/create-rubro.dto';
import { UpdateRubroDto } from '../dto/update-rubro.dto';
import { FilterRubrosDto } from '../dto/update-rubro.dto';

const MAX_NIVEL = 3;

// Helper to convert Decimal to number
const toNumber = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : Number(value);
};

// Helper to map Prisma result to RubroEntity
const toRubroEntity = (r: any): RubroEntity => ({
  id: r.id,
  nombre: r.nombre,
  descripcion: r.descripcion,
  codigo: r.codigo,
  parent_id: r.parent_id,
  nivel: r.nivel,
  default_markup: toNumber(r.default_markup),
  activo: r.activo,
  created_at: r.created_at,
  updated_at: r.updated_at,
  hijos: [],
});

@Injectable()
export class RubrosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: FilterRubrosDto = {}): Promise<RubroEntity[]> {
    const where: any = {};
    if (options.activo !== undefined) where.activo = options.activo;
    if (options.nivel) where.nivel = options.nivel;
    if (options.parent_id) where.parent_id = options.parent_id;
    else where.parent_id = null;
    const result = await this.prisma.rubros.findMany({ where, orderBy: { nombre: 'asc' } });
    return result.map(toRubroEntity);
  }

  async findById(id: string): Promise<RubroEntity | null> {
    const result = await this.prisma.rubros.findUnique({ where: { id } });
    if (!result) return null;
    return toRubroEntity(result);
  }

  async findChildren(parentId: string): Promise<RubroEntity[]> {
    const result = await this.prisma.rubros.findMany({
      where: { parent_id: parentId, activo: true },
      orderBy: { nombre: 'asc' },
    });
    return result.map(toRubroEntity);
  }

  async findRootRubros(): Promise<RubroEntity[]> {
    const result = await this.prisma.rubros.findMany({
      where: { parent_id: null },
      orderBy: { nombre: 'asc' },
    });
    return result.map(toRubroEntity);
  }

  async findTree(): Promise<RubroEntity[]> {
    const rootRubros = await this.findRootRubros();
    return this.buildTree(rootRubros);
  }

  private async buildTree(rubros: RubroEntity[]): Promise<RubroEntity[]> {
    const result: RubroEntity[] = [];
    for (const rubro of rubros) {
      const children = await this.findChildren(rubro.id);
      if (children.length > 0) {
        rubro.hijos = await this.buildTree(children);
      }
      result.push(rubro);
    }
    return result;
  }

  async calculateNivel(parentId: string): Promise<number> {
    const parent = await this.findById(parentId);
    if (!parent) throw new NotFoundException('Rubro padre no encontrado');
    return parent.nivel + 1;
  }

  async hasActiveChildren(id: string): Promise<boolean> {
    const children = await this.prisma.rubros.findMany({
      where: { parent_id: id, activo: true },
    });
    return children.length > 0;
  }

  async create(data: CreateRubroDto): Promise<RubroEntity> {
    let nivel = 1;
    if (data.parent_id) {
      nivel = await this.calculateNivel(data.parent_id);
      if (nivel > MAX_NIVEL) {
        throw new BadRequestException(`Máximo nivel de jerarquía alcanzado (${MAX_NIVEL})`);
      }
    }
    const result = await this.prisma.rubros.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        codigo: data.codigo,
        parent_id: data.parent_id,
        nivel,
        default_markup: data.default_markup,
      },
    });
    return toRubroEntity(result);
  }

  async update(id: string, data: UpdateRubroDto): Promise<RubroEntity> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException('Rubro no encontrado');
    const result = await this.prisma.rubros.update({ where: { id }, data });
    return toRubroEntity(result);
  }

  async softDelete(id: string): Promise<RubroEntity> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException('Rubro no encontrado');
    const hasChildren = await this.hasActiveChildren(id);
    if (hasChildren) throw new BadRequestException('No se puede eliminar rubro con sub-rubros activos');
    const result = await this.prisma.rubros.update({ where: { id }, data: { activo: false } });
    return toRubroEntity(result);
  }
}