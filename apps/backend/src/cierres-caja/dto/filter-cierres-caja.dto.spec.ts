import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { FilterCierresCajaDto } from './filter-cierres-caja.dto';

describe('FilterCierresCajaDto', () => {
  // ✅ Valid DTOs
  describe('valid DTOs', () => {
    it('should pass with no filters (empty query)', async () => {
      const dto = plainToInstance(FilterCierresCajaDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with caja_id filter', async () => {
      const dto = plainToInstance(FilterCierresCajaDto, {
        caja_id: '550e8400-e29b-41d4-a716-446655440000',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with fecha filter', async () => {
      const dto = plainToInstance(FilterCierresCajaDto, {
        fecha: '2026-04-20',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with fecha_desde filter', async () => {
      const dto = plainToInstance(FilterCierresCajaDto, {
        fecha_desde: '2026-04-01',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with fecha_hasta filter', async () => {
      const dto = plainToInstance(FilterCierresCajaDto, {
        fecha_hasta: '2026-04-30',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with fecha range (desde and hasta)', async () => {
      const dto = plainToInstance(FilterCierresCajaDto, {
        fecha_desde: '2026-04-01',
        fecha_hasta: '2026-04-30',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with all filters combined', async () => {
      const dto = plainToInstance(FilterCierresCajaDto, {
        caja_id: '550e8400-e29b-41d4-a716-446655440000',
        fecha: '2026-04-20',
        fecha_desde: '2026-04-01',
        fecha_hasta: '2026-04-30',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  // ❌ Invalid DTOs - caja_id
  describe('invalid caja_id', () => {
    it('should fail if caja_id is not a UUID', async () => {
      const dto = plainToInstance(FilterCierresCajaDto, {
        caja_id: 'not-a-uuid',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('caja_id');
    });
  });

  // ❌ Invalid DTOs - fecha
  describe('invalid fecha', () => {
    it('should fail if fecha is not ISO date string', async () => {
      const dto = plainToInstance(FilterCierresCajaDto, {
        fecha: '20/04/2026',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('fecha');
    });
  });

  // ❌ Invalid DTOs - fecha_desde
  describe('invalid fecha_desde', () => {
    it('should fail if fecha_desde is not ISO date string', async () => {
      const dto = plainToInstance(FilterCierresCajaDto, {
        fecha_desde: '01/04/2026',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('fecha_desde');
    });
  });

  // ❌ Invalid DTOs - fecha_hasta
  describe('invalid fecha_hasta', () => {
    it('should fail if fecha_hasta is not ISO date string', async () => {
      const dto = plainToInstance(FilterCierresCajaDto, {
        fecha_hasta: '30/04/2026',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('fecha_hasta');
    });
  });
});
