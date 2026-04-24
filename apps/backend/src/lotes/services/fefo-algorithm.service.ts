import { Injectable, NotFoundException } from '@nestjs/common';
import { Lote } from '../entities/lote.entity';

/**
 * LoteSelection - Result of FEFO selection
 */
export interface LoteSelection {
  lote_id: string;
  numero_lote: string;
  cantidad_tomada: number;
  cantidad_restante: number;
  fecha_vencimiento: Date | null;
}

/**
 * FEFO Algorithm Service - First Expired First Out
 * 
 * Selects lotes for sale following FEFO principle:
 * 1. Sort by fecha_vencimiento ASC (oldest first)
 * 2. Only use active lots with stock
 * 3. Skip expired lots
 * 4. Accumulate until quantity requirement is met
 * 
 * Business Rules (from design doc):
 * - Sell until last day (no warnings)
 * - FEFO = First Expired First Out
 * - Ignore lots with cantidad_actual = 0
 */
@Injectable()
export class FefoAlgorithmService {
  /**
   * Select lotes for sale following FEFO algorithm
   * 
   * @param lotes - Available lotes (should be pre-filtered for producto_id + activo)
   * @param cantidadRequerida - Quantity needed
   * @returns Array of selected lots with quantities
   */
  selectLotesForSale(
    lotes: Lote[],
    cantidadRequerida: number,
  ): LoteSelection[] {
    if (cantidadRequerida <= 0) {
      throw new Error('Quantity must be positive');
    }

    if (lotes.length === 0) {
      throw new NotFoundException('No lots available for this product');
    }

    // Sort by fecha_vencimiento ASC (FEFO)
    const sortedLotes = [...lotes].sort((a, b) => {
      // Lots without expiration go to the end
      if (!a.fecha_vencimiento && !b.fecha_vencimiento) return 0;
      if (!a.fecha_vencimiento) return 1;
      if (!b.fecha_vencimiento) return -1;
      return a.fecha_vencimiento.getTime() - b.fecha_vencimiento.getTime();
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selections: LoteSelection[] = [];
    let remaining = cantidadRequerida;

    for (const lote of sortedLotes) {
      // Skip if no stock
      if (!lote.hasStock()) {
        continue;
      }

      // Skip if expired (fecha_vencimiento < today)
      if (lote.isExpired()) {
        continue;
      }

      // Take what we need from this lot
      const cantidadTomada = Math.min(remaining, lote.cantidad_actual);
      
      selections.push({
        lote_id: lote.id,
        numero_lote: lote.numero_lote,
        cantidad_tomada: cantidadTomada,
        cantidad_restante: lote.cantidad_actual - cantidadTomada,
        fecha_vencimiento: lote.fecha_vencimiento,
      });

      remaining -= cantidadTomada;

      // If we've got enough, stop
      if (remaining <= 0) {
        break;
      }
    }

    // Check if we have enough stock
    if (remaining > 0) {
      const totalAvailable = lotes.reduce((sum, l) => sum + l.cantidad_actual, 0);
      throw new Error(
        `Insufficient stock. Required: ${cantidadRequerida}, Available: ${totalAvailable}`,
      );
    }

    return selections;
  }

  /**
   * Calculate total available stock across all lots for a product
   */
  calculateTotalStock(lotes: Lote[]): number {
    return lotes
      .filter(l => l.activo)
      .reduce((sum, l) => sum + l.cantidad_actual, 0);
  }

  /**
   * Find lots expiring within days
   */
  findExpiringSoon(lotes: Lote[], dias: number = 15): Lote[] {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + dias);

    return lotes
      .filter(l => l.activo && l.fecha_vencimiento !== null)
      .filter(l => l.fecha_vencimiento! <= deadline)
      .sort((a, b) => {
        if (!a.fecha_vencimiento) return 1;
        if (!b.fecha_vencimiento) return -1;
        return a.fecha_vencimiento.getTime() - b.fecha_vencimiento.getTime();
      });
  }

  /**
   * Find expired lots
   */
  findExpired(lotes: Lote[]): Lote[] {
    return lotes
      .filter(l => l.activo)
      .filter(l => l.isExpired());
  }

  /**
   * Validate that all selected lots are not expired
   */
  validateSelections(selections: LoteSelection[]): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return selections.every(s => {
      if (!s.fecha_vencimiento) return true;
      return s.fecha_vencimiento >= today;
    });
  }
}