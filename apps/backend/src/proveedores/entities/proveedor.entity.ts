import { Expose } from 'class-transformer';

export class ProveedorEntity {
  @Expose()
  id: string;

  @Expose()
  nombre: string;

  @Expose()
  razon_social: string | null;

  @Expose()
  cuit: string | null;

  @Expose()
  direccion: string | null;

  @Expose()
  telefono: string | null;

  @Expose()
  email: string | null;

  @Expose()
  contacto: string | null;

  @Expose()
  notas: string | null;

  @Expose()
  activo: boolean | null;

  @Expose()
  created_at: Date | null;

  @Expose()
  updated_at: Date | null;

  constructor(partial: Partial<ProveedorEntity>) {
    Object.assign(this, partial);
  }
}