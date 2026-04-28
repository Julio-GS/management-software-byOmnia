import { Exclude } from 'class-transformer';

export class UserEntity {
  id: string;
  username: string;
  email: string | null;
  
  @Exclude()
  password_hash: string;
  
  nombre_completo: string | null;
  rol: string; 
  activo: boolean;
  created_at: Date | null;
  updated_at: Date | null;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
