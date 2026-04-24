import { validate } from 'class-validator';
import { FilterMovimientosCajaDto } from './filter-movimientos-caja.dto';

describe('FilterMovimientosCajaDto', () => {
  describe('page', () => {
    it('should accept valid page number', async () => {
      const dto = new FilterMovimientosCajaDto();
      dto.page = 2;

      const errors = await validate(dto);
      const pageErrors = errors.filter((e) => e.property === 'page');
      expect(pageErrors).toHaveLength(0);
    });

    it('should default to 1 if not provided', async () => {
      const dto = new FilterMovimientosCajaDto();
      // page not set

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject page less than 1', async () => {
      const dto = new FilterMovimientosCajaDto();
      dto.page = 0;

      const errors = await validate(dto);
      const pageErrors = errors.filter((e) => e.property === 'page');
      expect(pageErrors.length).toBeGreaterThan(0);
      expect(pageErrors[0].constraints).toHaveProperty('min');
    });

    it('should reject non-integer page', async () => {
      const dto = new FilterMovimientosCajaDto();
      dto.page = 1.5;

      const errors = await validate(dto);
      const pageErrors = errors.filter((e) => e.property === 'page');
      expect(pageErrors.length).toBeGreaterThan(0);
      expect(pageErrors[0].constraints).toHaveProperty('isInt');
    });
  });

  describe('limit', () => {
    it('should accept valid limit', async () => {
      const dto = new FilterMovimientosCajaDto();
      dto.limit = 50;

      const errors = await validate(dto);
      const limitErrors = errors.filter((e) => e.property === 'limit');
      expect(limitErrors).toHaveLength(0);
    });

    it('should accept max limit (100)', async () => {
      const dto = new FilterMovimientosCajaDto();
      dto.limit = 100;

      const errors = await validate(dto);
      const limitErrors = errors.filter((e) => e.property === 'limit');
      expect(limitErrors).toHaveLength(0);
    });

    it('should reject limit exceeding 100', async () => {
      const dto = new FilterMovimientosCajaDto();
      dto.limit = 101;

      const errors = await validate(dto);
      const limitErrors = errors.filter((e) => e.property === 'limit');
      expect(limitErrors.length).toBeGreaterThan(0);
      expect(limitErrors[0].constraints).toHaveProperty('max');
    });

    it('should reject limit less than 1', async () => {
      const dto = new FilterMovimientosCajaDto();
      dto.limit = 0;

      const errors = await validate(dto);
      const limitErrors = errors.filter((e) => e.property === 'limit');
      expect(limitErrors.length).toBeGreaterThan(0);
      expect(limitErrors[0].constraints).toHaveProperty('min');
    });
  });

  describe('tipo', () => {
    it('should accept "gasto" as valid tipo', async () => {
      const dto = new FilterMovimientosCajaDto();
      dto.tipo = 'gasto';

      const errors = await validate(dto);
      const tipoErrors = errors.filter((e) => e.property === 'tipo');
      expect(tipoErrors).toHaveLength(0);
    });

    it('should accept "retiro" as valid tipo', async () => {
      const dto = new FilterMovimientosCajaDto();
      dto.tipo = 'retiro';

      const errors = await validate(dto);
      const tipoErrors = errors.filter((e) => e.property === 'tipo');
      expect(tipoErrors).toHaveLength(0);
    });

    it('should accept undefined tipo', async () => {
      const dto = new FilterMovimientosCajaDto();
      // tipo not set

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid tipo', async () => {
      const dto = new FilterMovimientosCajaDto();
      dto.tipo = 'ingreso' as any;

      const errors = await validate(dto);
      const tipoErrors = errors.filter((e) => e.property === 'tipo');
      expect(tipoErrors.length).toBeGreaterThan(0);
      expect(tipoErrors[0].constraints).toHaveProperty('isIn');
    });
  });

  describe('fecha_desde', () => {
    it('should accept valid ISO date string', async () => {
      const dto = new FilterMovimientosCajaDto();
      dto.fecha_desde = '2026-04-20T00:00:00.000Z';

      const errors = await validate(dto);
      const fechaErrors = errors.filter((e) => e.property === 'fecha_desde');
      expect(fechaErrors).toHaveLength(0);
    });

    it('should accept undefined fecha_desde', async () => {
      const dto = new FilterMovimientosCajaDto();
      // fecha_desde not set

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid date format', async () => {
      const dto = new FilterMovimientosCajaDto();
      dto.fecha_desde = 'not-a-date';

      const errors = await validate(dto);
      const fechaErrors = errors.filter((e) => e.property === 'fecha_desde');
      expect(fechaErrors.length).toBeGreaterThan(0);
      expect(fechaErrors[0].constraints).toHaveProperty('isDateString');
    });
  });

  describe('fecha_hasta', () => {
    it('should accept valid ISO date string', async () => {
      const dto = new FilterMovimientosCajaDto();
      dto.fecha_hasta = '2026-04-23T23:59:59.999Z';

      const errors = await validate(dto);
      const fechaErrors = errors.filter((e) => e.property === 'fecha_hasta');
      expect(fechaErrors).toHaveLength(0);
    });

    it('should accept undefined fecha_hasta', async () => {
      const dto = new FilterMovimientosCajaDto();
      // fecha_hasta not set

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid date format', async () => {
      const dto = new FilterMovimientosCajaDto();
      dto.fecha_hasta = 'invalid-date';

      const errors = await validate(dto);
      const fechaErrors = errors.filter((e) => e.property === 'fecha_hasta');
      expect(fechaErrors.length).toBeGreaterThan(0);
      expect(fechaErrors[0].constraints).toHaveProperty('isDateString');
    });
  });

  describe('combined filters', () => {
    it('should accept all filters combined', async () => {
      const dto = new FilterMovimientosCajaDto();
      dto.page = 2;
      dto.limit = 50;
      dto.tipo = 'gasto';
      dto.fecha_desde = '2026-04-01T00:00:00.000Z';
      dto.fecha_hasta = '2026-04-30T23:59:59.999Z';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
