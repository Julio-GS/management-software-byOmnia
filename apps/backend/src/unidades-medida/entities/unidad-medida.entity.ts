import { Expose } from 'class-transformer';

export class UnidadMedidaEntity {
  @Expose()
  id: string;

  @Expose()
  nombre: string;

  @Expose()
  abreviatura: string;

  @Expose()
  tipo: string | null;

  @Expose()
  activo: boolean | null;

  @Expose()
  created_at: Date | null;

  constructor(partial: Partial<UnidadMedidaEntity>) {
    Object.assign(this, partial);
  }
}