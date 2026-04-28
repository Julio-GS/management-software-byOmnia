import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateVentaDto } from './create-venta.dto';

describe('CreateVentaDto', () => {
  const validDto = {
    caja_id: '550e8400-e29b-41d4-a716-446655440001',
    items: [
      {
        producto_id: '550e8400-e29b-41d4-a716-446655440002',
        cantidad: 2,
      },
    ],
    medios_pago: [
      {
        medio_pago: 'efectivo',
        monto: 1000,
      },
    ],
  };

  describe('Validation', () => {
    it('should pass with valid minimal data', async () => {
      const dto = plainToInstance(CreateVentaDto, validDto);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with transaccion_id and observaciones', async () => {
      const dto = plainToInstance(CreateVentaDto, {
        ...validDto,
        transaccion_id: '550e8400-e29b-41d4-a716-446655440010',
        observaciones: 'Cliente frecuente',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with precio_manual for F/V/P/C product', async () => {
      const dto = plainToInstance(CreateVentaDto, {
        ...validDto,
        items: [
          { producto_id: '550e8400-e29b-41d4-a716-446655440002', cantidad: 1, precio_manual: 150.5 },
        ],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with split payment (multiple medios_pago)', async () => {
      const dto = plainToInstance(CreateVentaDto, {
        ...validDto,
        medios_pago: [
          { medio_pago: 'efectivo', monto: 3000 },
          { medio_pago: 'debito', monto: 2000 },
        ],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail if caja_id is missing', async () => {
      const dto = plainToInstance(CreateVentaDto, {
        items: validDto.items,
        medios_pago: validDto.medios_pago,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('caja_id');
    });

    it('should fail if caja_id is not a UUID', async () => {
      const dto = plainToInstance(CreateVentaDto, { ...validDto, caja_id: 'not-a-uuid' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('caja_id');
    });

    it('should fail if items is missing', async () => {
      const dto = plainToInstance(CreateVentaDto, {
        caja_id: validDto.caja_id,
        medios_pago: validDto.medios_pago,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'items')).toBe(true);
    });

    it('should fail if items is not an array', async () => {
      const dto = plainToInstance(CreateVentaDto, { ...validDto, items: 'not-an-array' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('items');
    });

    it('should fail if medios_pago is missing', async () => {
      const dto = plainToInstance(CreateVentaDto, {
        caja_id: validDto.caja_id,
        items: validDto.items,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'medios_pago')).toBe(true);
    });

    it('should fail if transaccion_id is not a UUID', async () => {
      const dto = plainToInstance(CreateVentaDto, { ...validDto, transaccion_id: 'invalid-uuid' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('transaccion_id');
    });

    it('should fail if medio_pago value is invalid', async () => {
      const dto = plainToInstance(CreateVentaDto, {
        ...validDto,
        medios_pago: [{ medio_pago: 'bitcoin', monto: 1000 }],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
