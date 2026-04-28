/**
 * UserRole enum — fuente única de verdad para los roles del sistema.
 *
 * Roles activos:
 *  - ADMIN:     Acceso total al sistema
 *  - ENCARGADO: Gestión del local (productos, precios, reportes, cierre de caja)
 *  - CAJERO:    Operaciones de POS (ventas, devoluciones, apertura de caja)
 *
 * @usage
 *   @Roles(UserRole.CAJERO, UserRole.ENCARGADO)
 *   @Get('/ventas')
 *   findAll() { ... }
 */
export enum UserRole {
  ADMIN = 'admin',
  CAJERO = 'cajero',
  ENCARGADO = 'encargado',
}
