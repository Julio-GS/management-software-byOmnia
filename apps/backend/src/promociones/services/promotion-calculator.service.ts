import { Injectable, Logger } from '@nestjs/common';
import { PromocionEntity } from '../entities/promocion.entity';
import { PromocionesRepository } from '../repositories/promociones.repository';

/**
 * Cart item for promotion calculation
 */
export interface CarritoItem {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
}

/**
 * Cart item with discount applied
 */
export interface CarritoItemConDescuento extends CarritoItem {
  descuento: number;
  total: number;
  promocion_id: string | null;
  promocion_nombre: string | null;
}

/**
 * Result of applying promotions to cart
 */
export interface CarritoConDescuentos {
  items: CarritoItemConDescuento[];
  subtotal: number;
  descuento_total: number;
  total: number;
  promociones_aplicadas: string[];
}

/**
 * PromotionCalculatorService
 * 
 * Auto-applies promotions in POS based on:
 * 1. Priority (higher = more important)
 * 2. Acumulabilidad (stacking)
 * 3. Validity (fecha, hora, dia_semana)
 */
@Injectable()
export class PromotionCalculatorService {
  private readonly logger = new Logger(PromotionCalculatorService.name);

  constructor(private readonly repository: PromocionesRepository) {}

  /**
   * Apply promotions to cart automatically
   * 
   * Algorithm:
   * 1. Get vigentes promociones
   * 2. Filter by products in cart
   * 3. Order by prioridad DESC
   * 4. Apply first NON-acumulable (or first if none acumulable)
   * 5. EXCEPTION: Jubilados can stack with non-acumulable
   */
  async aplicarPromocionesAutomaticas(
    carrito: CarritoItem[],
    esJubilado: boolean = false,
  ): Promise<CarritoConDescuentos> {
    if (carrito.length === 0) {
      return {
        items: [],
        subtotal: 0,
        descuento_total: 0,
        total: 0,
        promociones_aplicadas: [],
      };
    }

    // Get currently active promotions
    const vigentes = await this.repository.findVigEntes();
    
    if (vigentes.length === 0) {
      return this.buildResult(carrito, [], new Map(), esJubilado);
    }

    // Get product IDs in cart
    const productoIds = new Set(carrito.map(item => item.producto_id));

    // Filter promotions that apply to products in cart
    // AND build a map of promo_id → product_ids
    const aplicables = [];
    const promoProductosMap = new Map<string, string[]>();
    
    for (const promocion of vigentes) {
      const promoProductos = await this.repository.getProductos(promocion.id);
      promoProductosMap.set(promocion.id, promoProductos || []);
      
      // If no products specified, applies to all
      if (!promoProductos || promoProductos.length === 0) {
        aplicables.push(promocion);
        continue;
      }

      // Check if any product in cart is in promotion
      const tieneProducto = promoProductos.some(pid => productoIds.has(pid));
      if (tieneProducto) {
        aplicables.push(promocion);
      }
    }

    // Sort by priority DESC
    aplicables.sort((a, b) => b.prioridad - a.prioridad);

    // Apply promotions
    const promocionesAplicadas: PromocionEntity[] = [];
    let aplicarNoAcumulable = true;

    for (const promocion of aplicables) {
      if (promocion.acumulable) {
        // Acumulable promotions can always apply
        promocionesAplicadas.push(promocion);
      } else if (aplicarNoAcumulable) {
        // Only first non-acumulable applies, unless jubilado
        if (esJubilado) {
          // Jubilados can stack everything!
          promocionesAplicadas.push(promocion);
        } else {
          // Only first non-acumulable
          promocionesAplicadas.push(promocion);
          aplicarNoAcumulable = false;
        }
      }
    }

    return this.buildResult(carrito, promocionesAplicadas, promoProductosMap, esJubilado);
  }

  /**
   * Build result from cart and applied promotions
   */
  private buildResult(
    carrito: CarritoItem[],
    promociones: PromocionEntity[],
    promoProductosMap: Map<string, string[]>,
    esJubilado: boolean,
  ): CarritoConDescuentos {
    const items: CarritoItemConDescuento[] = [];
    let subtotal = 0;
    let descuento_total = 0;

    // Separate cart-level from item-level promotions
    const promocionesDeCarrito = promociones.filter(p => p.esDescuentoDeCarrito());
    const promocionesDeItem = promociones.filter(p => !p.esDescuentoDeCarrito());

    // Apply item-level promotions
    for (const item of carrito) {
      let descuento = 0;
      let promocion_id: string | null = null;
      let promocion_nombre: string | null = null;

      // Apply item-level promotions, pick the best discount
      for (const promocion of promocionesDeItem) {
        // Check if this promotion applies to this product
        const promoProductos = promoProductosMap.get(promocion.id) || [];
        const aplicaAEsteProducto = promoProductos.length === 0 || promoProductos.includes(item.producto_id);
        
        if (!aplicaAEsteProducto) {
          continue; // Skip this promotion for this item
        }

        const desc = promocion.calcularDescuento(item.precio_unitario, item.cantidad);
        if (desc > descuento) {
          descuento = desc;
          promocion_id = promocion.id;
          promocion_nombre = promocion.nombre;
        }
      }

      const itemSubtotal = item.precio_unitario * item.cantidad;
      const itemTotal = itemSubtotal - descuento;

      subtotal += itemSubtotal;
      descuento_total += descuento;

      items.push({
        ...item,
        descuento,
        total: itemTotal,
        promocion_id,
        promocion_nombre,
      });
    }

    // Apply cart-level promotions (e.g., descuento_monto)
    for (const promocion of promocionesDeCarrito) {
      const desc = promocion.calcularDescuento(0, 0); // Cart-level doesn't need price/qty
      descuento_total += desc;
    }

    return {
      items,
      subtotal,
      descuento_total,
      total: subtotal - descuento_total,
      promociones_aplicadas: promociones.map(p => p.id),
    };
  }

  /**
   * Calculate discount for a single item
   */
  calcularDescuentoItem(
    item: CarritoItem,
    promocion: PromocionEntity,
  ): number {
    return promocion.calcularDescuento(item.precio_unitario, item.cantidad);
  }

  /**
   * Check if a promotion is valid now
   */
  async isPromocionVigente(promocionId: string): Promise<boolean> {
    const vigentes = await this.repository.findVigEntes();
    return vigentes.some(p => p.id === promocionId);
  }

  /**
   * Get best applicable promotion for a product
   */
  async getMejorPromocion(productoId: string): Promise<PromocionEntity | null> {
    const vigentes = await this.repository.findVigEntes();
    
    let mejor: PromocionEntity | null = null;
    let mejorDescuento = 0;

    for (const promocion of vigentes) {
      const promoProductos = await this.repository.getProductos(promocion.id);
      
      // If no products or includes this product
      if (promoProductos.length === 0 || promoProductos.includes(productoId)) {
        // For comparison, assume 1 unit at $100
        const descuento = promocion.calcularDescuento(100, 1);
        if (descuento > mejorDescuento) {
          mejorDescuento = descuento;
          mejor = promocion;
        }
      }
    }

    return mejor;
  }
}