import { Test, TestingModule } from '@nestjs/testing';
import { ExcelExportService } from './excel-export.service';
import { ReportsRepository } from '../repositories/reports.repository';

describe('ExcelExportService', () => {
  let service: ExcelExportService;
  let reportsRepository: ReportsRepository;

  beforeEach(async () => {
    const mockRepository = {
      getStockActual: jest.fn().mockResolvedValue([
        { codigo: 'P01', detalle: 'Prod 1', stock_total: 5, lotes_activos: 1, stock_bajo: true, stock_minimo: 10 },
      ]),
      getProximosVencer: jest.fn().mockResolvedValue([]),
      getSinMovimiento: jest.fn().mockResolvedValue([]),
      getPromocionesVigentes: jest.fn().mockResolvedValue([]),
      getVentasDiarias: jest.fn().mockResolvedValue([]),
      getEfectividadPromociones: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExcelExportService,
        { provide: ReportsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<ExcelExportService>(ExcelExportService);
    reportsRepository = module.get(ReportsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exportReport', () => {
    it('should generate excel buffer for stock_actual', async () => {
      const dto = { reportType: 'stock_actual', filters: {} };
      const result = await service.exportReport(dto as any);
      expect(result).toBeInstanceOf(Buffer);
      expect(reportsRepository.getStockActual).toHaveBeenCalled();
    });

    it('should call repository.getVentasDiarias for ventas_diarias report', async () => {
      const dto = { reportType: 'ventas_diarias', filters: {} };
      await service.exportReport(dto as any);
      expect(reportsRepository.getVentasDiarias).toHaveBeenCalled();
    });

    it('should call repository.getPromocionesVigentes for promociones_vigentes report', async () => {
      const dto = { reportType: 'promociones_vigentes', filters: {} };
      await service.exportReport(dto as any);
      expect(reportsRepository.getPromocionesVigentes).toHaveBeenCalled();
    });

    it('should call repository.getEfectividadPromociones for efectividad_promociones report', async () => {
      const dto = { reportType: 'efectividad_promociones', filters: {} };
      await service.exportReport(dto as any);
      expect(reportsRepository.getEfectividadPromociones).toHaveBeenCalled();
    });

    it('should throw BadRequestException for unknown reportType', async () => {
      const dto = { reportType: 'invalid_type', filters: {} };
      await expect(service.exportReport(dto as any)).rejects.toThrow();
    });
  });
});
