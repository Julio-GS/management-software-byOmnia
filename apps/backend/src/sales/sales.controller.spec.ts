import { Test, TestingModule } from '@nestjs/testing';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { CreateVentaDto, AnularVentaDto, FilterVentasDto } from './dto/create-venta.dto';

describe('SalesController', () => {
  let controller: SalesController;
  let salesService: jest.Mocked<SalesService>;

  const mockVenta = {
    id: 'venta-1',
    numero_ticket: 'CAJA1-20260420-0001',
    total: 1000,
    anulada: false,
  };

  beforeEach(async () => {
    const mockSalesService = {
      createVenta: jest.fn().mockResolvedValue(mockVenta),
      findAll: jest.fn().mockResolvedValue({ data: [mockVenta], total: 1, page: 1, limit: 20 }),
      findOne: jest.fn().mockResolvedValue(mockVenta),
      findByNumeroTicket: jest.fn().mockResolvedValue(mockVenta),
      findByCajaHoy: jest.fn().mockResolvedValue([mockVenta]),
      anularVenta: jest.fn().mockResolvedValue({ ...mockVenta, anulada: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesController],
      providers: [
        { provide: SalesService, useValue: mockSalesService },
      ],
    }).compile();

    controller = module.get<SalesController>(SalesController);
    salesService = module.get(SalesService) as any;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /ventas (create)', () => {
    it('should call salesService.createVenta with dto and userId', async () => {
      const dto: CreateVentaDto = {
        caja_id: 'caja-uuid-1',
        items: [{ producto_id: 'prod-1', cantidad: 2 }],
        medios_pago: [{ medio_pago: 'efectivo', monto: 1000 }],
      };
      const user = { id: 'user-1' };

      const result = await controller.create(dto, user);

      expect(result).toEqual(mockVenta);
      expect(salesService.createVenta).toHaveBeenCalledWith(dto, 'user-1');
    });
  });

  describe('GET /ventas (findAll)', () => {
    it('should call salesService.findAll with filters', async () => {
      const query: FilterVentasDto = { page: 1, limit: 20 } as any;
      const result = await controller.findAll(query);

      expect(result.data).toHaveLength(1);
      expect(salesService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('GET /ventas/:id (findOne)', () => {
    it('should call salesService.findOne with id', async () => {
      const result = await controller.findOne('venta-1');

      expect(result).toEqual(mockVenta);
      expect(salesService.findOne).toHaveBeenCalledWith('venta-1');
    });
  });

  describe('GET /ventas/ticket/:numero (findByNumeroTicket)', () => {
    it('should call salesService.findByNumeroTicket with numero', async () => {
      const result = await controller.findByNumeroTicket('CAJA1-20260420-0001');

      expect(result).toEqual(mockVenta);
      expect(salesService.findByNumeroTicket).toHaveBeenCalledWith('CAJA1-20260420-0001');
    });
  });

  describe('GET /ventas/caja/:id (findByCajaHoy)', () => {
    it('should call salesService.findByCajaHoy with cajaId', async () => {
      const result = await controller.findByCajaHoy('caja-1');

      expect(result).toHaveLength(1);
      expect(salesService.findByCajaHoy).toHaveBeenCalledWith('caja-1');
    });
  });

  describe('POST /ventas/:id/anular (anular)', () => {
    it('should call salesService.anularVenta with id, dto and userId', async () => {
      const dto: AnularVentaDto = { motivo_anulacion: 'Error de precio en el ticket' };
      const user = { id: 'encargado-1' };

      const result = await controller.anular('venta-1', dto, user);

      expect(result.anulada).toBe(true);
      expect(salesService.anularVenta).toHaveBeenCalledWith('venta-1', dto, 'encargado-1');
    });
  });
});
