import { Injectable, NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import * as crypto from 'crypto';
import { PromotionCalculatorService } from '../promociones/services/promotion-calculator.service';
import { CreateVentaDto, AnularVentaDto, FilterVentasDto, TicketItemDto } from './dto/create-venta.dto';
import { BusinessException } from '../shared/exceptions/business.exception';
import { SaleCreatedEvent } from '../shared/events/sale-created.event';
import { SalesRepository } from './repositories/sales.repository';

// -----------------------------------------------------------------------
// Internal types
// -----------------------------------------------------------------------

interface Producto {
  id: string;
  detalle: string;
  codigo: string;
  precio_venta: number | { toNumber: () => number } | string;
  requiere_precio_manual: boolean | null;
  maneja_lotes: boolean | null;
  maneja_stock: boolean | null;
  iva: number | { toNumber: () => number } | string | null;
  activo: boolean | null;
}

interface LoteSelection {
  lote_id: string;
  cantidad: number;
}

interface ProcessedItem {
  producto_id: string;
  lote_id: string | null;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  descuento: number;
  total: number;
  iva_porcentaje: number;
  iva_monto: number;
  promocion_id: string | null;
}

// -----------------------------------------------------------------------

@Injectable()
export class SalesService {
  constructor(
    private readonly salesRepository: SalesRepository,
    private readonly eventBus: EventBus,
    private readonly promotionCalculator: PromotionCalculatorService,
  ) {}

  // =====================================================================
  // POST /ventas — FLUJO COMPLETO (12 PASOS)
  // =====================================================================

  async createVenta(dto: CreateVentaDto, userId: string, isOfflineSync = false) {
    const conflictosStock = [];

    return this.salesRepository.executeTransaction(
      async (tx) => {
        // STEP 1: Validar que la caja existe y está activa
        const caja = await this.salesRepository.findCajaById(dto.caja_id, tx);
        if (!caja || !caja.activo) {
          throw new BusinessException(
            `Caja ${dto.caja_id} no encontrada o inactiva`,
            'CAJA_INACTIVA',
          );
        }

        // STEP 2: Cargar productos y validar precio manual (F/V/P/C)
        const productos = await this.cargarProductos(dto.items, tx);

        // STEP 3: Validar stock y procesar FEFO
        const { itemsProcesados, conflictos } = await this.procesarItemsConFEFO(
          dto.items,
          productos,
          isOfflineSync,
          tx,
        );
        conflictosStock.push(...conflictos);

        // STEP 4: Aplicar promociones automáticas
        const carritoParaPromociones = itemsProcesados.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
        }));

        const carritoConDescuentos =
          await this.promotionCalculator.aplicarPromocionesAutomaticas(
            carritoParaPromociones,
          );

        // STEP 5: Merge descuentos de la calculadora en itemsProcesados
        const itemsFinales: ProcessedItem[] = itemsProcesados.map((item) => {
          const itemConDesc = carritoConDescuentos.items.find(
            (i) => i.producto_id === item.producto_id,
          );
          const descuento = itemConDesc?.descuento ?? 0;
          const total = item.subtotal - descuento;
          return {
            ...item,
            descuento,
            total,
            promocion_id: itemConDesc?.promocion_id ?? null,
          };
        });

        // STEP 6: Calcular totales
        const subtotal = itemsFinales.reduce((s, i) => s + i.subtotal, 0);
        const descuentos = itemsFinales.reduce((s, i) => s + i.descuento, 0);
        const total = subtotal - descuentos;

        // STEP 7: Validar medios de pago
        const vuelto = this.validarMediosPago(total, dto.medios_pago);

        // STEP 8: Generar número de ticket
        const numeroTicket = await this.generarNumeroTicket(dto.caja_id, caja.numero, tx);

        // STEP 9: Crear venta (cabecera)
        const venta = await this.salesRepository.crearVenta({
          numero_ticket: numeroTicket,
          transaccion_id: dto.transaccion_id ?? crypto.randomUUID(),
          caja_id: dto.caja_id,
          subtotal,
          descuentos,
          total,
          vuelto,
          usuario_id: userId,
          observaciones: dto.observaciones,
        }, tx);

        // STEP 10: Crear detalle_ventas (bulk)
        await this.salesRepository.crearDetallesVenta(
          itemsFinales.map((item) => ({
            venta_id: venta.id,
            producto_id: item.producto_id,
            lote_id: item.lote_id,
            promocion_id: item.promocion_id,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.subtotal,
            descuento: item.descuento,
            total: item.total,
            iva_porcentaje: item.iva_porcentaje,
            iva_monto: item.iva_monto,
          })),
          tx,
        );

        // STEP 11: Crear medios_pago_venta (bulk)
        await this.salesRepository.crearMediosPago(
          dto.medios_pago.map((mp) => ({
            venta_id: venta.id,
            transaccion_id: venta.transaccion_id,
            medio_pago: mp.medio_pago,
            monto: mp.monto,
          })),
          tx,
        );

        // STEP 12: Crear movimientos_stock (uno por item procesado)
        await this.salesRepository.crearMovimientosStock(
          itemsFinales.map((item) => ({
            producto_id: item.producto_id,
            lote_id: item.lote_id ?? undefined,
            tipo_movimiento: 'venta',
            cantidad: item.cantidad,
            referencia: numeroTicket,
            venta_id: venta.id,
            usuario_id: userId,
          })),
          tx,
        );

        // STEP 13: Emitir evento
        this.eventBus.publish(
          new SaleCreatedEvent(
            venta.id,
            venta.numero_ticket,
            Number(venta.total),
            itemsFinales.map((i) => ({
              productId: i.producto_id,
              quantity: i.cantidad,
              price: i.precio_unitario,
              subtotal: i.subtotal,
            })),
            dto.medios_pago.map((mp) => mp.medio_pago).join('+'),
            venta.fecha ?? new Date(),
            userId,
          ),
        );

        // Retornar venta completa y conflictos (si hay)
        const ventaCompleta = await this.salesRepository.getVentaCompleta(venta.id, tx);
        return { venta: ventaCompleta, conflictos: conflictosStock };
      },
      {
        isolationLevel: 'Serializable',
        timeout: 10000,
      },
    );
  }

  // =====================================================================
  // GET /ventas — Con paginación y filtros
  // =====================================================================

  async findAll(filters: FilterVentasDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.salesRepository.findAll(filters, skip, limit);

    return { data, total, page, limit };
  }

  // =====================================================================
  // GET /ventas/:id — Detalle completo
  // =====================================================================

  async findOne(id: string) {
    const venta = await this.salesRepository.findOne(id);
    if (!venta) throw new NotFoundException(`Venta ${id} no encontrada`);
    return venta;
  }

  // =====================================================================
  // GET /ventas/ticket/:numero
  // =====================================================================

  async findByNumeroTicket(numeroTicket: string) {
    const venta = await this.salesRepository.findByNumeroTicket(numeroTicket);
    if (!venta) throw new NotFoundException(`Ticket ${numeroTicket} no encontrado`);
    return venta;
  }

  // =====================================================================
  // GET /ventas/caja/:id — Ventas del día de una caja
  // =====================================================================

  async findByCajaHoy(cajaId: string) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    return this.salesRepository.findByCajaHoy(cajaId, hoy, manana);
  }

  // =====================================================================
  // POST /ventas/:id/anular
  // =====================================================================

  async anularVenta(id: string, dto: AnularVentaDto, userId: string) {
    const venta = await this.salesRepository.findOne(id);

    if (!venta) throw new NotFoundException(`Venta ${id} no encontrada`);
    if (venta.anulada) {
      throw new BusinessException('La venta ya está anulada', 'VENTA_YA_ANULADA');
    }

    return this.salesRepository.anularVenta(id, dto.motivo_anulacion);
  }

  // =====================================================================
  // Private: Generación número de ticket
  // =====================================================================

  private async generarNumeroTicket(cajaId: string, cajaNumero: number, tx: any): Promise<string> {
    const hoy = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const prefix = `CAJA${cajaNumero}-${hoy}`;

    const ultimaVenta = await this.salesRepository.getUltimaVentaCajaByPrefix(cajaId, prefix, tx);

    let secuencia = 1;
    if (ultimaVenta) {
      const parts = ultimaVenta.numero_ticket.split('-');
      secuencia = parseInt(parts[2], 10) + 1;
    }

    return `${prefix}-${secuencia.toString().padStart(4, '0')}`;
  }

  // =====================================================================
  // Private: Cargar productos y validar precio manual
  // =====================================================================

  private async cargarProductos(items: TicketItemDto[], tx: any): Promise<Map<string, Producto>> {
    const productoIds = [...new Set(items.map((i) => i.producto_id))];
    const rawProductos: Producto[] = await this.salesRepository.findProductosActivos(productoIds, tx);

    const map = new Map<string, Producto>(rawProductos.map((p) => [p.id, p]));

    for (const item of items) {
      const prod = map.get(item.producto_id);
      if (!prod) {
        throw new NotFoundException(`Producto ${item.producto_id} no encontrado o inactivo`);
      }

      // Validar precio manual (F/V/P/C)
      if (prod.requiere_precio_manual && !item.precio_manual) {
        throw new BusinessException(
          `Producto "${prod.detalle}" requiere precio manual`,
          'PRECIO_MANUAL_REQUERIDO',
        );
      }

      if (item.precio_manual && (item.precio_manual < 0.01 || item.precio_manual > 999999)) {
        throw new BusinessException(
          'Precio manual debe estar entre $0.01 y $999999',
          'PRECIO_MANUAL_FUERA_DE_RANGO',
        );
      }
    }

    return map;
  }

  // =====================================================================
  // Private: FEFO + Stock validation
  // =====================================================================

  private async procesarItemsConFEFO(
    items: TicketItemDto[],
    productos: Map<string, Producto>,
    isOfflineSync: boolean,
    tx: any,
  ): Promise<{ itemsProcesados: ProcessedItem[]; conflictos: any[] }> {
    const result: ProcessedItem[] = [];
    const conflictos: any[] = [];

    for (const item of items) {
      const prod = productos.get(item.producto_id);
      const precioUnitario = item.precio_manual ?? Number(prod.precio_venta);
      const iva = Number(prod.iva ?? 0);

      if (prod.maneja_lotes && prod.maneja_stock) {
        // FEFO: seleccionar lotes automáticamente
        const { seleccion, faltante } = await this.selectLotesFEFO(item.producto_id, item.cantidad, isOfflineSync, tx);

        if (faltante > 0) {
          conflictos.push({
            producto_id: item.producto_id,
            solicitado: item.cantidad,
            disponible: item.cantidad - faltante,
            mensaje: `Stock insuficiente en lotes para "${prod.detalle}"`,
          });
        }

        for (const loteSelection of seleccion) {
          const subtotal = precioUnitario * loteSelection.cantidad;
          const ivaMonto = (subtotal * iva) / 100;

          result.push({
            producto_id: item.producto_id,
            lote_id: loteSelection.lote_id,
            cantidad: loteSelection.cantidad,
            precio_unitario: precioUnitario,
            subtotal,
            descuento: 0,
            total: subtotal,
            iva_porcentaje: iva,
            iva_monto: ivaMonto,
            promocion_id: null,
          });
        }
      } else if (prod.maneja_stock) {
        // Producto con stock pero sin lotes — validar disponibilidad
        const disponible = await this.salesRepository.getStockDisponible(item.producto_id, tx);

        if (disponible < item.cantidad) {
          if (!isOfflineSync) {
            throw new BusinessException(
              `Stock insuficiente para "${prod.detalle}": disponible ${disponible}, solicitado ${item.cantidad}`,
              'STOCK_INSUFICIENTE',
            );
          } else {
            conflictos.push({
              producto_id: item.producto_id,
              solicitado: item.cantidad,
              disponible: disponible,
              mensaje: `Venta offline excedió stock de "${prod.detalle}"`,
            });
          }
        }

        const subtotal = precioUnitario * item.cantidad;
        const ivaMonto = (subtotal * iva) / 100;

        result.push({
          producto_id: item.producto_id,
          lote_id: null,
          cantidad: item.cantidad,
          precio_unitario: precioUnitario,
          subtotal,
          descuento: 0,
          total: subtotal,
          iva_porcentaje: iva,
          iva_monto: ivaMonto,
          promocion_id: null,
        });
      } else {
        // Producto sin stock (F/V/P/C)
        const subtotal = precioUnitario * item.cantidad;
        const ivaMonto = (subtotal * iva) / 100;

        result.push({
          producto_id: item.producto_id,
          lote_id: null,
          cantidad: item.cantidad,
          precio_unitario: precioUnitario,
          subtotal,
          descuento: 0,
          total: subtotal,
          iva_porcentaje: iva,
          iva_monto: ivaMonto,
          promocion_id: null,
        });
      }
    }

    return { itemsProcesados: result, conflictos };
  }

  // =====================================================================
  // Private: FEFO — First Expired First Out
  // =====================================================================

  private async selectLotesFEFO(
    productoId: string,
    cantidadRequerida: number,
    isOfflineSync: boolean,
    tx: any,
  ): Promise<{ seleccion: LoteSelection[]; faltante: number }> {
    const lotes = await this.salesRepository.findLotesDisponibles(productoId, tx);

    const seleccion: LoteSelection[] = [];
    let restante = cantidadRequerida;

    for (const lote of lotes) {
      if (restante <= 0) break;
      const tomar = Math.min(restante, lote.cantidad_actual);
      seleccion.push({ lote_id: lote.id, cantidad: tomar });
      restante -= tomar;
    }

    if (restante > 0 && !isOfflineSync) {
      throw new BusinessException(
        `Stock insuficiente por lotes: faltan ${restante} unidades`,
        'STOCK_INSUFICIENTE',
      );
    } else if (restante > 0 && isOfflineSync) {
      // Si es offline y falta stock, lo mandamos sin lote específico (lote_id = null)
      // para que quede registrado el movimiento negativo
      seleccion.push({ lote_id: null as any, cantidad: restante });
    }

    return { seleccion, faltante: restante > 0 && !isOfflineSync ? restante : (isOfflineSync && restante > 0 ? restante : 0) };
  }

  // =====================================================================
  // Private: Validar medios de pago
  // =====================================================================

  private validarMediosPago(total: number, mediosPago: any[]): number {
    const sumaPagos = mediosPago.reduce((sum, mp) => sum + mp.monto, 0);

    if (sumaPagos < total) {
      throw new BusinessException(
        `Pago insuficiente: recibido $${sumaPagos.toFixed(2)}, requerido $${total.toFixed(2)}`,
        'PAGO_INSUFICIENTE',
      );
    }

    const totalEfectivo = mediosPago
      .filter((mp) => mp.medio_pago === 'efectivo')
      .reduce((sum, mp) => sum + mp.monto, 0);

    return Math.max(0, totalEfectivo - total);
  }
}
