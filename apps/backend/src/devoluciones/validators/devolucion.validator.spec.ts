import { Test, TestingModule } from '@nestjs/testing';
import { DevolucionValidator } from './devolucion.validator';
import { PrismaService } from '../../database/prisma.service';
import { BusinessException } from '../../shared/exceptions/business.exception';
import { NotFoundException } from '@nestjs/common';

describe('DevolucionValidator', () => {
  let validator: DevolucionValidator;
  let prisma: PrismaService;

  const mockVentaId = '123e4567-e89b-12d3-a456-426614174000';
  const mockProductoId = '123e4567-e89b-12d3-a456-426614174001';

  const mockPrisma = {
    ventas: {
      findUnique: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevolucionValidator,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    validator = module.get<DevolucionValidator>(DevolucionValidator);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateVentaExists', () => {
    it('should pass when venta exists', async () => {
      const mockVenta = {
        id: mockVentaId,
        anulada: false,
      };
      mockPrisma.ventas.findUnique.mockResolvedValue(mockVenta);

      await expect(validator.validateVentaExists(mockVentaId)).resolves.not.toThrow();
    });

    it('should throw NotFoundException when venta not found', async () => {
      mockPrisma.ventas.findUnique.mockResolvedValue(null);

      await expect(validator.validateVentaExists(mockVentaId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw with correct message when venta not found', async () => {
      mockPrisma.ventas.findUnique.mockResolvedValue(null);

      await expect(validator.validateVentaExists(mockVentaId)).rejects.toThrow(
        'Venta no encontrada',
      );
    });
  });

  describe('validateVentaNotAnulada', () => {
    it('should pass when venta is not anulada', async () => {
      const mockVenta = {
        id: mockVentaId,
        anulada: false,
      };
      mockPrisma.ventas.findUnique.mockResolvedValue(mockVenta);

      await expect(validator.validateVentaNotAnulada(mockVentaId)).resolves.not.toThrow();
    });

    it('should throw BusinessException when venta is anulada', async () => {
      const mockVenta = {
        id: mockVentaId,
        anulada: true,
      };
      mockPrisma.ventas.findUnique.mockResolvedValue(mockVenta);

      await expect(validator.validateVentaNotAnulada(mockVentaId)).rejects.toThrow(
        BusinessException,
      );
    });

    it('should throw with correct message when venta anulada', async () => {
      const mockVenta = {
        id: mockVentaId,
        anulada: true,
      };
      mockPrisma.ventas.findUnique.mockResolvedValue(mockVenta);

      await expect(validator.validateVentaNotAnulada(mockVentaId)).rejects.toThrow(
        'No se puede devolver producto de una venta anulada',
      );
    });

    it('should throw NotFoundException when venta not found', async () => {
      mockPrisma.ventas.findUnique.mockResolvedValue(null);

      await expect(validator.validateVentaNotAnulada(mockVentaId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('validateCantidadDisponible', () => {
    it('should pass when cantidad is within disponible', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          cantidad_vendida: 10,
          cantidad_ya_devuelta: 0,
          disponible: 10,
        },
      ]);

      await expect(
        validator.validateCantidadDisponible(mockVentaId, mockProductoId, 5),
      ).resolves.not.toThrow();
    });

    it('should pass when requesting exact disponible amount', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          cantidad_vendida: 10,
          cantidad_ya_devuelta: 7,
          disponible: 3,
        },
      ]);

      await expect(
        validator.validateCantidadDisponible(mockVentaId, mockProductoId, 3),
      ).resolves.not.toThrow();
    });

    it('should throw when cantidad exceeds disponible', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          cantidad_vendida: 10,
          cantidad_ya_devuelta: 7,
          disponible: 3,
        },
      ]);

      await expect(
        validator.validateCantidadDisponible(mockVentaId, mockProductoId, 5),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw with correct disponible amount in message', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          cantidad_vendida: 10,
          cantidad_ya_devuelta: 7,
          disponible: 3,
        },
      ]);

      await expect(
        validator.validateCantidadDisponible(mockVentaId, mockProductoId, 5),
      ).rejects.toThrow('Máximo disponible: 3');
    });

    it('should throw when no detalle_venta found', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      await expect(
        validator.validateCantidadDisponible(mockVentaId, mockProductoId, 1),
      ).rejects.toThrow(BusinessException);
    });

    it('should handle multiple partial devoluciones correctly', async () => {
      // First devolucion: 3 out of 10
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          cantidad_vendida: 10,
          cantidad_ya_devuelta: 3,
          disponible: 7,
        },
      ]);

      await expect(
        validator.validateCantidadDisponible(mockVentaId, mockProductoId, 2),
      ).resolves.not.toThrow();

      // Second devolucion: trying to return 6 when only 5 available (after first 5 already returned)
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          cantidad_vendida: 10,
          cantidad_ya_devuelta: 5, // 3 + 2
          disponible: 5,
        },
      ]);

      await expect(
        validator.validateCantidadDisponible(mockVentaId, mockProductoId, 6),
      ).rejects.toThrow(BusinessException);
    });

    it('should handle decimal quantities correctly', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          cantidad_vendida: 2.5,
          cantidad_ya_devuelta: 1.0,
          disponible: 1.5,
        },
      ]);

      await expect(
        validator.validateCantidadDisponible(mockVentaId, mockProductoId, 1.5),
      ).resolves.not.toThrow();

      await expect(
        validator.validateCantidadDisponible(mockVentaId, mockProductoId, 1.6),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('validateProductoInVenta', () => {
    it('should pass when producto exists in detalle_venta', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          disponible: 10,
        },
      ]);

      await expect(
        validator.validateProductoInVenta(mockVentaId, mockProductoId),
      ).resolves.not.toThrow();
    });

    it('should throw when producto not found in venta', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      await expect(
        validator.validateProductoInVenta(mockVentaId, mockProductoId),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw with correct message when producto not in venta', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      await expect(
        validator.validateProductoInVenta(mockVentaId, mockProductoId),
      ).rejects.toThrow('Producto no encontrado en venta');
    });
  });

  describe('validateAll (integration)', () => {
    it('should pass all validations for valid devolucion', async () => {
      const mockVenta = {
        id: mockVentaId,
        anulada: false,
      };
      mockPrisma.ventas.findUnique.mockResolvedValue(mockVenta);
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          cantidad_vendida: 10,
          cantidad_ya_devuelta: 0,
          disponible: 10,
        },
      ]);

      await expect(
        validator.validateAll(mockVentaId, mockProductoId, 5),
      ).resolves.not.toThrow();
    });

    it('should fail if any validation fails (venta anulada)', async () => {
      const mockVenta = {
        id: mockVentaId,
        anulada: true,
      };
      mockPrisma.ventas.findUnique.mockResolvedValue(mockVenta);

      await expect(
        validator.validateAll(mockVentaId, mockProductoId, 5),
      ).rejects.toThrow(BusinessException);
    });

    it('should fail if cantidad exceeds disponible', async () => {
      const mockVenta = {
        id: mockVentaId,
        anulada: false,
      };
      mockPrisma.ventas.findUnique.mockResolvedValue(mockVenta);
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          disponible: 3,
        },
      ]);

      await expect(
        validator.validateAll(mockVentaId, mockProductoId, 5),
      ).rejects.toThrow(BusinessException);
    });
  });
});
