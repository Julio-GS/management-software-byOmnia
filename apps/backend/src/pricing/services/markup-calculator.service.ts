import { Injectable, Logger } from '@nestjs/common';
import { PricingRepository } from '../repositories/pricing.repository';

/**
 * MarkupCalculatorService
 * 
 * Calculates prices from cost + markup + IVA
 * Formula:
 *   precio_sin_iva = costo * (1 + markup/100)
 *   precio_final = precio_sin_iva * (1 + iva/100)
 */
@Injectable()
export class MarkupCalculatorService {
  private readonly logger = new Logger(MarkupCalculatorService.name);

  constructor(private readonly repository: PricingRepository) {}

  /**
   * Calculate price from cost
   * Formula: precio_final = costo * (1 + markup/100) * (1 + iva/100)
   */
  calculatePrice(costo: number, markup: number, iva: number): number {
    if (costo < 0 || markup < 0 || iva < 0) {
      throw new Error('Cost, markup, and IVA must be non-negative');
    }

    const precio_sin_iva = costo * (1 + markup / 100);
    const precio_final = precio_sin_iva * (1 + iva / 100);

    return Math.round(precio_final * 100) / 100;
  }

  /**
   * Calculate markup from cost and price
   * Formula: markup = (precio/costo - 1) * 100
   */
  calculateMarkup(costo: number, precioVenta: number): number {
    if (costo <= 0) {
      throw new Error('Cost must be greater than 0');
    }

    if (precioVenta < 0) {
      throw new Error('Price must be non-negative');
    }

    // If price is 0, return 0 markup
    if (precioVenta === 0) return 0;

    const markup = ((precioVenta / costo) - 1) * 100;
    return Math.round(markup * 100) / 100;
  }

  /**
   * Get default markup from rubro
   */
  async getDefaultMarkupByRubro(rubroId: string): Promise<number> {
    return this.repository.getDefaultMarkupByRubro(rubroId);
  }

  /**
   * Calculate price with all components for display
   */
  calculateFull(costo: number, markup: number, iva: number): {
    costo: number;
    markup: number;
    iva: number;
    precio_sin_iva: number;
    precio_final: number;
  } {
    if (costo < 0 || markup < 0 || iva < 0) {
      throw new Error('All values must be non-negative');
    }

    const precio_sin_iva = Math.round(costo * (1 + markup / 100) * 100) / 100;
    const precio_final = Math.round(precio_sin_iva * (1 + iva / 100) * 100) / 100;

    return {
      costo,
      markup,
      iva,
      precio_sin_iva,
      precio_final,
    };
  }
}