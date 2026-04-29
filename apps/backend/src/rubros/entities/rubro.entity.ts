import { Expose, Type } from 'class-transformer';

export class RubroEntity {
  @Expose()
  id: string;

  @Expose()
  nombre: string;

  @Expose()
  descripcion: string | null;

  @Expose()
  codigo: string | null;

  @Expose()
  parent_id: string | null;

  @Expose()
  nivel: number;

  @Expose()
  default_markup: number | null;

  @Expose()
  activo: boolean | null;

  @Expose()
  created_at: Date | null;

  @Expose()
  updated_at: Date | null;

  @Expose()
  @Type(() => RubroEntity)
  hijos?: RubroEntity[];

  constructor(partial: Partial<RubroEntity>) {
    Object.assign(this, partial);
  }
}