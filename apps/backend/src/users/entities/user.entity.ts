import { Exclude } from 'class-transformer';
import type { User, UserRole } from '@omnia/shared-types';

// UserEntity represents the database model
// It's compatible with the shared User type but keeps role as string for Prisma
export class UserEntity {
  id: string;
  username: string;
  email: string | null;
  
  @Exclude()
  password: string;
  
  firstName: string;
  lastName: string;
  role: string; // Stored as string in DB, validated as UserRole in DTOs
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }

  // Helper method to get full name
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
