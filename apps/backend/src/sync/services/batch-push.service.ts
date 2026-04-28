import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SalesService } from '../../sales/sales.service';
import { BatchPushDto, SyncOperationType, SyncEntityType } from '../dto/batch-push.dto';
import { BatchPushResultDto } from '../dto/batch-push-result.dto';

@Injectable()
export class BatchPushService {
  private readonly logger = new Logger(BatchPushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly salesService: SalesService,
  ) {}

  async processBatch(dto: BatchPushDto, userId: string): Promise<BatchPushResultDto> {
    const result: BatchPushResultDto = {
      processed: 0,
      failed: 0,
      errors: [],
      stock_conflicts: [],
    };

    for (const operation of dto.operations) {
      try {
        if (operation.entity_type === SyncEntityType.VENTA && operation.operation_type === SyncOperationType.CREATE) {
          // 1. Check de Idempotencia: ¿Ya existe esta transacción?
          const existing = await this.prisma.ventas.findFirst({
            where: { transaccion_id: operation.transaccion_id }
          });

          if (existing) {
            this.logger.debug(`Idempotencia skip: Venta ${operation.transaccion_id} ya existe`);
            result.processed++;
            continue;
          }

          // 2. Procesar venta offline (isOfflineSync = true)
          const payload = operation.payload;
          // Garantizamos que use los IDs correctos que vinieron del envelope
          payload.caja_id = dto.caja_id;
          payload.transaccion_id = operation.transaccion_id;

          // isOfflineSync = true permite stock negativo y devuelve los conflictos (Opción A)
          const saleResult = await this.salesService.createVenta(payload, userId, true);
          
          if (saleResult.conflictos && saleResult.conflictos.length > 0) {
             result.stock_conflicts.push(...saleResult.conflictos);
          }
          
          result.processed++;
        } else {
          // Operaciones futuras: caja_movimiento, cierre_caja
          this.logger.warn(`Operación no implementada: ${operation.entity_type} - ${operation.operation_type}`);
          result.failed++;
          result.errors.push({
            transaccion_id: operation.transaccion_id,
            error: 'Operación no implementada en backend'
          });
        }
      } catch (error: any) {
        this.logger.error(`Error procesando operación ${operation.transaccion_id}: ${error.message}`, error.stack);
        result.failed++;
        result.errors.push({
          transaccion_id: operation.transaccion_id,
          error: error.message
        });
      }
    }

    return result;
  }
}
