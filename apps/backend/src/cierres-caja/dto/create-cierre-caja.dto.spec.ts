import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCierreCajaDto } from './create-cierre-caja.dto';

describe('CreateCierreCajaDto', () => {
  // ✅ Valid DTOs
  describe('valid DTOs', () => {
    it('should pass with all required fields', async () => {
      const dto = plainToInstance(CreateCierreCajaDto, {
        caja_id: '550e8400-e29b-41d4-a716-446655440000',
        fecha: '2026-04-20',
        efectivo_fisico: 1500.5,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with optional motivo_diferencia', async () => {
      const dto = plainToInstance(CreateCierreCajaDto, {
        caja_id: '550e8400-e29b-41d4-a716-446655440000',
        fecha: '2026-04-20',
        efectivo_fisico: 1500,
        motivo_diferencia: 'Error de conteo',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with optional observaciones', async () => {
      const dto = plainToInstance(CreateCierreCajaDto, {
        caja_id: '550e8400-e29b-41d4-a716-446655440000',
        fecha: '2026-04-20',
        efectivo_fisico: 1500,
        observaciones: 'Cierre con retraso por falta de sistema',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with efectivo_fisico = 0', async () => {
      const dto = plainToInstance(CreateCierreCajaDto, {
        caja_id: '550e8400-e29b-41d4-a716-446655440000',
        fecha: '2026-04-20',
        efectivo_fisico: 0,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  // ❌ Invalid DTOs - caja_id
  describe('invalid caja_id', () => {
    it('should fail if caja_id is missing', async () => {
      const dto = plainToInstance(CreateCierreCajaDto, {
        fecha: '2026-04-20',
        efectivo_fisico: 1500,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('caja_id');
    });

    it('should fail if caja_id is not a UUID', async () => {
      const dto = plainToInstance(CreateCierreCajaDto, {
        caja_id: 'not-a-uuid',
        fecha: '2026-04-20',
        efectivo_fisico: 1500,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('caja_id');
    });
  });

  // ❌ Invalid DTOs - fecha
  describe('invalid fecha', () => {
    it('should fail if fecha is missing', async () => {
      const dto = plainToInstance(CreateCierreCajaDto, {
        caja_id: '550e8400-e29b-41d4-a716-446655440000',
        efectivo_fisico: 1500,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('fecha');
    });

    it('should fail if fecha is not ISO date string', async () => {
      const dto = plainToInstance(CreateCierreCajaDto, {
        caja_id: '550e8400-e29b-41d4-a716-446655440000',
        fecha: '20/04/2026',
        efectivo_fisico: 1500,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('fecha');
    });
  });

  // ❌ Invalid DTOs - efectivo_fisico
  describe('invalid efectivo_fisico', () => {
    it('should fail if efectivo_fisico is missing', async () => {
      const dto = plainToInstance(CreateCierreCajaDto, {
        caja_id: '550e8400-e29b-41d4-a716-446655440000',
        fecha: '2026-04-20',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('efectivo_fisico');
    });

    it('should fail if efectivo_fisico is negative', async () => {
      const dto = plainToInstance(CreateCierreCajaDto, {
        caja_id: '550e8400-e29b-41d4-a716-446655440000',
        fecha: '2026-04-20',
        efectivo_fisico: -100,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('efectivo_fisico');
    });

    it('should fail if efectivo_fisico is not a number', async () => {
      const dto = plainToInstance(CreateCierreCajaDto, {
        caja_id: '550e8400-e29b-41d4-a716-446655440000',
        fecha: '2026-04-20',
        efectivo_fisico: 'mil quinientos',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('efectivo_fisico');
    });
  });
});
