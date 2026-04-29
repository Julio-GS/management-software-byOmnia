import { Test, TestingModule } from '@nestjs/testing';
import { RefundCalculatorService } from './refund-calculator.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('RefundCalculatorService', () => {
  let service: RefundCalculatorService;
  let prisma: PrismaService;

  const mockVentaId = '123e4567-e89b-12d3-a456-426614174000';
  const mockProductoId = '123e4567-e89b-12d3-a456-426614174001';

  const mockPrisma = {
    detalle_ventas: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundCalculatorService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<RefundCalculatorService>(RefundCalculatorService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calcularMontoDevuelto', () => {
    it('should calculate refund for simple case without discount', async () => {
      // Given: producto vendido a $100 x 10 unidades = $1000 total
      const detalleVenta = {
        cantidad: 10,
        subtotal: 1000,
        descuento: 0,
        total: 1000,
      };
      mockPrisma.detalle_ventas.findFirst.mockResolvedValue(detalleVenta);

      // When: devolver 5 unidades
      const result = await service.calcularMontoDevuelto(mockVentaId, mockProductoId, 5);

      // Then: refund = (1000 / 10) * 5 = 500
      expect(result).toBe(500);
    });

    it('should calculate refund with promotion discount applied', async () => {
      // Given: producto con promoción 10% descuento
      // subtotal = 1000, descuento = 100, total = 900
      // precio con descuento = 900 / 10 = 90 por unidad
      const detalleVenta = {
        cantidad: 10,
        subtotal: 1000,
        descuento: 100,
        total: 900,
      };
      mockPrisma.detalle_ventas.findFirst.mockResolvedValue(detalleVenta);

      // When: devolver 5 unidades
      const result = await service.calcularMontoDevuelto(mockVentaId, mockProductoId, 5);

      // Then: refund = (900 / 10) * 5 = 450
      expect(result).toBe(450);
    });

    it('should calculate refund for partial return (3 of 5 units)', async () => {
      // Given: 5 unidades vendidas a $200 cada una con 10% descuento
      // subtotal = 1000, descuento = 100, total = 900
      const detalleVenta = {
        cantidad: 5,
        subtotal: 1000,
        descuento: 100,
        total: 900,
      };
      mockPrisma.detalle_ventas.findFirst.mockResolvedValue(detalleVenta);

      // When: devolver 3 unidades
      const result = await service.calcularMontoDevuelto(mockVentaId, mockProductoId, 3);

      // Then: refund = (900 / 5) * 3 = 540
      expect(result).toBe(540);
    });

    it('should calculate refund for total return (all 10 units)', async () => {
      // Given: 10 unidades con descuento
      const detalleVenta = {
        cantidad: 10,
        subtotal: 1000,
        descuento: 100,
        total: 900,
      };
      mockPrisma.detalle_ventas.findFirst.mockResolvedValue(detalleVenta);

      // When: devolver todas las 10 unidades
      const result = await service.calcularMontoDevuelto(mockVentaId, mockProductoId, 10);

      // Then: refund = total completo = 900
      expect(result).toBe(900);
    });

    it('should handle decimal quantities correctly', async () => {
      // Given: producto vendido por peso (decimal)
      const detalleVenta = {
        cantidad: 2.5, // 2.5 kg
        subtotal: 250,
        descuento: 0,
        total: 250,
      };
      mockPrisma.detalle_ventas.findFirst.mockResolvedValue(detalleVenta);

      // When: devolver 1.5 kg
      const result = await service.calcularMontoDevuelto(mockVentaId, mockProductoId, 1.5);

      // Then: refund = (250 / 2.5) * 1.5 = 150
      expect(result).toBe(150);
    });

    it('should throw NotFoundException when detalle_venta not found', async () => {
      mockPrisma.detalle_ventas.findFirst.mockResolvedValue(null);

      await expect(
        service.calcularMontoDevuelto(mockVentaId, mockProductoId, 5),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with correct message', async () => {
      mockPrisma.detalle_ventas.findFirst.mockResolvedValue(null);

      await expect(
        service.calcularMontoDevuelto(mockVentaId, mockProductoId, 5),
      ).rejects.toThrow('Producto no encontrado en venta');
    });
  });
});
