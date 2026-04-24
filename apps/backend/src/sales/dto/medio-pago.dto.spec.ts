import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { MedioPagoDto } from './medio-pago.dto';

describe('MedioPagoDto', () => {
  describe('Validation', () => {
    it('should pass with valid efectivo', async () => {
      const dto = plainToInstance(MedioPagoDto, {
        medio_pago: 'efectivo',
        monto: 1000,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid debito', async () => {
      const dto = plainToInstance(MedioPagoDto, {
        medio_pago: 'debito',
        monto: 500.50,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid credito', async () => {
      const dto = plainToInstance(MedioPagoDto, {
        medio_pago: 'credito',
        monto: 2000,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid transferencia', async () => {
      const dto = plainToInstance(MedioPagoDto, {
        medio_pago: 'transferencia',
        monto: 3000,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid qr', async () => {
      const dto = plainToInstance(MedioPagoDto, {
        medio_pago: 'qr',
        monto: 1500,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail if medio_pago is missing', async () => {
      const dto = plainToInstance(MedioPagoDto, {
        monto: 1000,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('medio_pago');
    });

    it('should fail if medio_pago is invalid', async () => {
      const dto = plainToInstance(MedioPagoDto, {
        medio_pago: 'bitcoin',
        monto: 1000,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('medio_pago');
    });

    it('should fail if monto is missing', async () => {
      const dto = plainToInstance(MedioPagoDto, {
        medio_pago: 'efectivo',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('monto');
    });

    it('should fail if monto is zero', async () => {
      const dto = plainToInstance(MedioPagoDto, {
        medio_pago: 'efectivo',
        monto: 0,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('monto');
    });

    it('should fail if monto is negative', async () => {
      const dto = plainToInstance(MedioPagoDto, {
        medio_pago: 'efectivo',
        monto: -100,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('monto');
    });

    it('should fail if monto is below 0.01', async () => {
      const dto = plainToInstance(MedioPagoDto, {
        medio_pago: 'efectivo',
        monto: 0.005,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('monto');
    });
  });
});
