import { Test, TestingModule } from '@nestjs/testing';
import { CierresCajaController } from './cierres-caja.controller';
import { CierresCajaService } from './cierres-caja.service';
import { CreateCierreCajaDto } from './dto/create-cierre-caja.dto';
import { FilterCierresCajaDto } from './dto/filter-cierres-caja.dto';

describe('CierresCajaController', () => {
  let controller: CierresCajaController;
  let service: CierresCajaService;

  const mockService = {
    createCierre: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CierresCajaController],
      providers: [
        {
          provide: CierresCajaService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CierresCajaController>(CierresCajaController);
    service = module.get<CierresCajaService>(CierresCajaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ✅ POST /cierres-caja
  describe('create', () => {
    it('should create cierre and return it', async () => {
      const dto: CreateCierreCajaDto = {
        caja_id: '550e8400-e29b-41d4-a716-446655440000',
        fecha: '2026-04-20',
        efectivo_fisico: 2200,
      };

      const mockUser = { id: 'user-1', username: 'admin' };
      const mockCreatedCierre = { id: '1', ...dto };

      mockService.createCierre.mockResolvedValue(mockCreatedCierre);

      const result = await controller.create(dto, mockUser);

      expect(result).toEqual(mockCreatedCierre);
      expect(service.createCierre).toHaveBeenCalledWith(dto, 'user-1');
    });
  });

  // ✅ GET /cierres-caja
  describe('findAll', () => {
    it('should return all cierres with filters', async () => {
      const filters: FilterCierresCajaDto = {
        caja_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const mockCierres = [{ id: '1' }, { id: '2' }];

      mockService.findAll.mockResolvedValue(mockCierres);

      const result = await controller.findAll(filters);

      expect(result).toEqual(mockCierres);
      expect(service.findAll).toHaveBeenCalledWith(filters);
    });

    it('should return all cierres without filters', async () => {
      const mockCierres = [{ id: '1' }, { id: '2' }];

      mockService.findAll.mockResolvedValue(mockCierres);

      const result = await controller.findAll({});

      expect(result).toEqual(mockCierres);
      expect(service.findAll).toHaveBeenCalledWith({});
    });
  });

  // ✅ GET /cierres-caja/:id
  describe('findOne', () => {
    it('should return cierre by id', async () => {
      const mockCierre = { id: '1' };

      mockService.findById.mockResolvedValue(mockCierre);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockCierre);
      expect(service.findById).toHaveBeenCalledWith('1');
    });
  });
});
