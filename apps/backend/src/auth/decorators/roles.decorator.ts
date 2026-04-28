import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';

export const ROLES_KEY = 'roles';

/**
 * Decorador @Roles — restringe el acceso a uno o más roles específicos.
 *
 * @example
 *   @Roles(UserRole.CAJERO, UserRole.ENCARGADO)
 *   @Get('/ventas')
 *   findAll() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
