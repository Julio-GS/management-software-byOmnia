import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PdfExportService } from './services/pdf-export.service';
import { ExcelExportService } from './services/excel-export.service';
import { BadRequestException } from '@nestjs/common';
import { ExportReportDto } from './dto/export-report.dto';

describe('ReportsController', () => {
  let controller: ReportsController;
  let pdfExportService: jest.Mocked<PdfExportService>;
  let excelExportService: jest.Mocked<ExcelExportService>;
  let mockRes: any;

  beforeEach(async () => {
    const mockReportsService = {
      getStockActual: jest.fn().mockResolvedValue([]),
      getProximosVencer: jest.fn().mockResolvedValue([]),
      getSinMovimiento: jest.fn().mockResolvedValue([]),
      getPromocionesVigentes: jest.fn().mockResolvedValue([]),
      getVentasDiarias: jest.fn().mockResolvedValue([]),
      getEfectividadPromociones: jest.fn().mockResolvedValue([]),
      getSalesTrends: jest.fn().mockResolvedValue([]),
    };

    const mockPdfExportService = {
      generateSalesReceipt: jest.fn().mockResolvedValue(Buffer.from('pdf')),
      exportReport: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    };

    const mockExcelExportService = {
      exportReport: jest.fn().mockResolvedValue(Buffer.from('excel')),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        { provide: ReportsService, useValue: mockReportsService },
        { provide: PdfExportService, useValue: mockPdfExportService },
        { provide: ExcelExportService, useValue: mockExcelExportService },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    pdfExportService = module.get(PdfExportService);
    excelExportService = module.get(ExcelExportService);

    mockRes = {
      set: jest.fn(),
      send: jest.fn(),
    };
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('exportPdf', () => {
    it('should use generateSalesReceipt for sales_receipt type', async () => {
      const dto: ExportReportDto = { reportType: 'sales_receipt', ventaId: 'abc-123' };
      await controller.exportPdf(dto, mockRes);
      expect(pdfExportService.generateSalesReceipt).toHaveBeenCalledWith('abc-123');
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should throw if sales_receipt missing ventaId', async () => {
      const dto: ExportReportDto = { reportType: 'sales_receipt' };
      await expect(controller.exportPdf(dto, mockRes)).rejects.toThrow(BadRequestException);
    });

    it('should use exportReport for stock_actual type', async () => {
      const dto: ExportReportDto = { reportType: 'stock_actual' };
      await controller.exportPdf(dto, mockRes);
      expect(pdfExportService.exportReport).toHaveBeenCalledWith(dto);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should use exportReport for ventas_diarias type', async () => {
      const dto: ExportReportDto = { reportType: 'ventas_diarias' };
      await controller.exportPdf(dto, mockRes);
      expect(pdfExportService.exportReport).toHaveBeenCalledWith(dto);
    });
  });

  describe('exportExcel', () => {
    it('should throw for sales_receipt type (not supported in Excel)', async () => {
      const dto: ExportReportDto = { reportType: 'sales_receipt' };
      await expect(controller.exportExcel(dto, mockRes)).rejects.toThrow(BadRequestException);
    });

    it('should use exportReport for stock_actual type', async () => {
      const dto: ExportReportDto = { reportType: 'stock_actual' };
      await controller.exportExcel(dto, mockRes);
      expect(excelExportService.exportReport).toHaveBeenCalledWith(dto);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should use exportReport for ventas_diarias type', async () => {
      const dto: ExportReportDto = { reportType: 'ventas_diarias' };
      await controller.exportExcel(dto, mockRes);
      expect(excelExportService.exportReport).toHaveBeenCalledWith(dto);
    });

    it('should set correct Excel content-type header', async () => {
      const dto: ExportReportDto = { reportType: 'stock_actual' };
      await controller.exportExcel(dto, mockRes);
      expect(mockRes.set).toHaveBeenCalledWith(expect.objectContaining({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }));
    });
  });
});
