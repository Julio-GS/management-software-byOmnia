import { validate } from 'class-validator';
import { CreateMovimientoCajaDto } from './create-movimiento-caja.dto';

describe('CreateMovimientoCajaDto', () => {
  describe('tipo', () => {
    it('should accept "gasto" as valid tipo', async () => {
      const dto = new CreateMovimientoCajaDto();
      dto.tipo = 'gasto';
      dto.monto = 100.5;
      dto.concepto = 'Pago de luz';

      const errors = await validate(dto);
      const tipoErrors = errors.filter((e) => e.property === 'tipo');
      expect(tipoErrors).toHaveLength(0);
    });

    it('should accept "retiro" as valid tipo', async () => {
      const dto = new CreateMovimientoCajaDto();
      dto.tipo = 'retiro';
      dto.monto = 1000;
      dto.concepto = 'Retiro gerencia';

      const errors = await validate(dto);
      const tipoErrors = errors.filter((e) => e.property === 'tipo');
      expect(tipoErrors).toHaveLength(0);
    });

    it('should reject invalid tipo', async () => {
      const dto = new CreateMovimientoCajaDto();
      dto.tipo = 'ingreso'; // ❌ NO permitido
      dto.monto = 100;
      dto.concepto = 'Test';

      const errors = await validate(dto);
      const tipoErrors = errors.filter((e) => e.property === 'tipo');
      expect(tipoErrors.length).toBeGreaterThan(0);
      expect(tipoErrors[0].constraints).toHaveProperty('isIn');
    });

    it('should reject empty tipo', async () => {
      const dto = new CreateMovimientoCajaDto();
      dto.monto = 100;
      dto.concepto = 'Test';

      const errors = await validate(dto);
      const tipoErrors = errors.filter((e) => e.property === 'tipo');
      expect(tipoErrors.length).toBeGreaterThan(0);
    });
  });

  describe('monto', () => {
    it('should accept positive decimal monto', async () => {
      const dto = new CreateMovimientoCajaDto();
      dto.tipo = 'gasto';
      dto.monto = 1234.56;
      dto.concepto = 'Test';

      const errors = await validate(dto);
      const montoErrors = errors.filter((e) => e.property === 'monto');
      expect(montoErrors).toHaveLength(0);
    });

    it('should accept minimum monto (0.01)', async () => {
      const dto = new CreateMovimientoCajaDto();
      dto.tipo = 'gasto';
      dto.monto = 0.01;
      dto.concepto = 'Test';

      const errors = await validate(dto);
      const montoErrors = errors.filter((e) => e.property === 'monto');
      expect(montoErrors).toHaveLength(0);
    });

    it('should reject monto below 0.01', async () => {
      const dto = new CreateMovimientoCajaDto();
      dto.tipo = 'gasto';
      dto.monto = 0.005;
      dto.concepto = 'Test';

      const errors = await validate(dto);
      const montoErrors = errors.filter((e) => e.property === 'monto');
      expect(montoErrors.length).toBeGreaterThan(0);
      expect(montoErrors[0].constraints).toHaveProperty('min');
    });

    it('should reject non-numeric monto', async () => {
      const dto = new CreateMovimientoCajaDto();
      dto.tipo = 'gasto';
      dto.monto = 'abc' as any;
      dto.concepto = 'Test';

      const errors = await validate(dto);
      const montoErrors = errors.filter((e) => e.property === 'monto');
      expect(montoErrors.length).toBeGreaterThan(0);
    });
  });

  describe('concepto', () => {
    it('should accept valid concepto', async () => {
      const dto = new CreateMovimientoCajaDto();
      dto.tipo = 'gasto';
      dto.monto = 100;
      dto.concepto = 'Pago de servicios públicos';

      const errors = await validate(dto);
      const conceptoErrors = errors.filter((e) => e.property === 'concepto');
      expect(conceptoErrors).toHaveLength(0);
    });

    it('should accept concepto at max length (200 chars)', async () => {
      const dto = new CreateMovimientoCajaDto();
      dto.tipo = 'gasto';
      dto.monto = 100;
      dto.concepto = 'a'.repeat(200);

      const errors = await validate(dto);
      const conceptoErrors = errors.filter((e) => e.property === 'concepto');
      expect(conceptoErrors).toHaveLength(0);
    });

    it('should reject concepto exceeding 200 chars', async () => {
      const dto = new CreateMovimientoCajaDto();
      dto.tipo = 'gasto';
      dto.monto = 100;
      dto.concepto = 'a'.repeat(201);

      const errors = await validate(dto);
      const conceptoErrors = errors.filter((e) => e.property === 'concepto');
      expect(conceptoErrors.length).toBeGreaterThan(0);
      expect(conceptoErrors[0].constraints).toHaveProperty('maxLength');
    });

    it('should reject empty concepto', async () => {
      const dto = new CreateMovimientoCajaDto();
      dto.tipo = 'gasto';
      dto.monto = 100;
      dto.concepto = '';

      const errors = await validate(dto);
      const conceptoErrors = errors.filter((e) => e.property === 'concepto');
      expect(conceptoErrors.length).toBeGreaterThan(0);
      expect(conceptoErrors[0].constraints).toHaveProperty('minLength');
    });
  });

  describe('comprobante (optional)', () => {
    it('should accept valid comprobante', async () => {
      const dto = new CreateMovimientoCajaDto();
      dto.tipo = 'gasto';
      dto.monto = 100;
      dto.concepto = 'Test';
      dto.comprobante = 'FAC-001-12345';

      const errors = await validate(dto);
      const comprobanteErrors = errors.filter(
        (e) => e.property === 'comprobante',
      );
      expect(comprobanteErrors).toHaveLength(0);
    });

    it('should accept undefined comprobante', async () => {
      const dto = new CreateMovimientoCajaDto();
      dto.tipo = 'gasto';
      dto.monto = 100;
      dto.concepto = 'Test';
      // comprobante is undefined

      const errors = await validate(dto);
      const comprobanteErrors = errors.filter(
        (e) => e.property === 'comprobante',
      );
      expect(comprobanteErrors).toHaveLength(0);
    });

    it('should reject comprobante exceeding 100 chars', async () => {
      const dto = new CreateMovimientoCajaDto();
      dto.tipo = 'gasto';
      dto.monto = 100;
      dto.concepto = 'Test';
      dto.comprobante = 'a'.repeat(101);

      const errors = await validate(dto);
      const comprobanteErrors = errors.filter(
        (e) => e.property === 'comprobante',
      );
      expect(comprobanteErrors.length).toBeGreaterThan(0);
      expect(comprobanteErrors[0].constraints).toHaveProperty('maxLength');
    });
  });

  describe('observaciones (optional)', () => {
    it('should accept valid observaciones', async () => {
      const dto = new CreateMovimientoCajaDto();
      dto.tipo = 'gasto';
      dto.monto = 100;
      dto.concepto = 'Test';
      dto.observaciones = 'Observación larga con detalles adicionales';

      const errors = await validate(dto);
      const observacionesErrors = errors.filter(
        (e) => e.property === 'observaciones',
      );
      expect(observacionesErrors).toHaveLength(0);
    });

    it('should accept undefined observaciones', async () => {
      const dto = new CreateMovimientoCajaDto();
      dto.tipo = 'gasto';
      dto.monto = 100;
      dto.concepto = 'Test';
      // observaciones is undefined

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
