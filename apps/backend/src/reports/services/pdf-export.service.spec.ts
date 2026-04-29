import { Test, TestingModule } from '@nestjs/testing';
import { PdfExportService } from './pdf-export.service';
import { PrismaService } from '../../database/prisma.service';
import { ReportsRepository } from '../repositories/reports.repository';
import { NotFoundException } from '@nestjs/common';

jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => {
    const events: Record<string, Function[]> = {};
    return {
      on: jest.fn((event: string, callback: Function) => {
        if (!events[event]) events[event] = [];
        events[event].push(callback);
        if (event === 'data') callback(Buffer.from('mock-chunk'));
        if (event === 'end') setTimeout(() => callback(), 5);
      }),
      fontSize: jest.fn().mockReturnThis(),
      font: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      moveDown: jest.fn().mockReturnThis(),
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      stroke: jest.fn().mockReturnThis(),
      fillColor: jest.fn().mockReturnThis(),
      addPage: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      page: { width: 595, height: 842 },
      y: 100,
    };
  });
});

describe('PdfExportService', () => {
  let service: PdfExportService;
  let prismaService: PrismaService;
  let reportsRepository: ReportsRepository;

  beforeEach(async () => {
    const mockPrisma = {
      ventas: {
        findUnique: jest.fn(),
      },
    };

    const mockRepository = {
      getStockActual: jest.fn().mockResolvedValue([]),
      getProximosVencer: jest.fn().mockResolvedValue([]),
      getSinMovimiento: jest.fn().mockResolvedValue([]),
      getPromocionesVigentes: jest.fn().mockResolvedValue([]),
      getVentasDiarias: jest.fn().mockResolvedValue([]),
      getEfectividadPromociones: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfExportService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ReportsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<PdfExportService>(PdfExportService);
    prismaService = module.get(PrismaService);
    reportsRepository = module.get(ReportsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSalesReceipt', () => {
    it('should generate a PDF buffer for a valid sale', async () => {
      (prismaService.ventas.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        numero_ticket: 'T001',
        fecha: new Date(),
        total: 100,
        descuentos: 0,
        detalle_ventas: [
          { cantidad: 2, total: 100, productos: { detalle: 'Prod 1' } },
        ],
      });

      const result = await service.generateSalesReceipt('1');
      expect(result).toBeInstanceOf(Buffer);
      expect(prismaService.ventas.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if sale not found', async () => {
      (prismaService.ventas.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.generateSalesReceipt('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('exportReport', () => {
    it('should call repository.getStockActual for stock_actual report', async () => {
      const dto = { reportType: 'stock_actual', filters: {} };
      await service.exportReport(dto as any);
      expect(reportsRepository.getStockActual).toHaveBeenCalled();
    });

    it('should call repository.getVentasDiarias for ventas_diarias report', async () => {
      const dto = { reportType: 'ventas_diarias', filters: {} };
      await service.exportReport(dto as any);
      expect(reportsRepository.getVentasDiarias).toHaveBeenCalled();
    });

    it('should call repository.getProximosVencer for proximos_vencer report', async () => {
      const dto = { reportType: 'proximos_vencer', filters: {} };
      await service.exportReport(dto as any);
      expect(reportsRepository.getProximosVencer).toHaveBeenCalled();
    });

    it('should throw BadRequestException for unknown reportType', async () => {
      const dto = { reportType: 'invalid_type', filters: {} };
      await expect(service.exportReport(dto as any)).rejects.toThrow();
    });
  });
});
