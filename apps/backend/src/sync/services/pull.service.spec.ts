import { Test, TestingModule } from '@nestjs/testing';
import { PullService } from './pull.service';
import { PrismaService } from '../../database/prisma.service';

describe('PullService', () => {
  let service: PullService;
  let prisma: PrismaService;

  const mockPrisma = {
    productos: { findMany: jest.fn() },
    rubros: { findMany: jest.fn() },
    proveedores: { findMany: jest.fn() },
    lotes: { findMany: jest.fn() },
    promociones: { findMany: jest.fn() },
    unidades_medida: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PullService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PullService>(PullService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should fetch all required entities using "since" date for delta sync', async () => {
    mockPrisma.productos.findMany.mockResolvedValue([{ id: 'prod-1' }]);
    mockPrisma.rubros.findMany.mockResolvedValue([]);
    mockPrisma.proveedores.findMany.mockResolvedValue([]);
    mockPrisma.lotes.findMany.mockResolvedValue([]);
    mockPrisma.promociones.findMany.mockResolvedValue([]);
    mockPrisma.unidades_medida.findMany.mockResolvedValue([]);
    mockPrisma.$queryRaw.mockResolvedValue([{ producto_id: 'prod-1', stock_total: 10 }]);

    const sinceDate = '2023-01-01T00:00:00.000Z';
    const result = await service.pullChanges(sinceDate);

    // Assert that the properties exist
    expect(result).toHaveProperty('timestamp');
    expect(result.productos).toHaveLength(1);
    expect(result.stock_snapshot).toHaveLength(1);

    // Verify Prisma query params for entities that track updated_at
    const expectedSince = new Date(sinceDate);
    expect(mockPrisma.productos.findMany).toHaveBeenCalledWith({
      where: { updated_at: { gt: expectedSince } },
    });
    expect(mockPrisma.rubros.findMany).toHaveBeenCalledWith({
      where: { updated_at: { gt: expectedSince } },
    });
    
    // Verify entities that don't track updated_at
    expect(mockPrisma.lotes.findMany).toHaveBeenCalledWith({
      where: { activo: true, cantidad_actual: { gt: 0 } },
    });
  });

  it('should use epoch 0 if no since param is provided', async () => {
    mockPrisma.productos.findMany.mockResolvedValue([]);
    mockPrisma.rubros.findMany.mockResolvedValue([]);
    mockPrisma.proveedores.findMany.mockResolvedValue([]);
    mockPrisma.lotes.findMany.mockResolvedValue([]);
    mockPrisma.promociones.findMany.mockResolvedValue([]);
    mockPrisma.unidades_medida.findMany.mockResolvedValue([]);
    mockPrisma.$queryRaw.mockResolvedValue([]);

    await service.pullChanges(undefined);

    const expectedSince = new Date(0);
    expect(mockPrisma.productos.findMany).toHaveBeenCalledWith({
      where: { updated_at: { gt: expectedSince } },
    });
  });
});
