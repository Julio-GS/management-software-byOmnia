import { Type } from 'class-transformer';
import { ValidateNested, IsArray, IsString, IsNotEmpty, IsObject, IsEnum } from 'class-validator';

export enum SyncEntityType {
  VENTA = 'venta',
  CAJA_MOVIMIENTO = 'caja_movimiento',
  CIERRE_CAJA = 'cierre_caja',
}

export enum SyncOperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export class SyncOperationDto {
  @IsString()
  @IsNotEmpty()
  transaccion_id: string; // Idempotency key fundamental para evitar ventas dobles

  @IsEnum(SyncEntityType)
  entity_type: SyncEntityType;

  @IsEnum(SyncOperationType)
  operation_type: SyncOperationType;

  @IsObject()
  payload: any; // Datos de la venta o movimiento
}

export class BatchPushDto {
  @IsString()
  @IsNotEmpty()
  caja_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncOperationDto)
  operations: SyncOperationDto[];
}
