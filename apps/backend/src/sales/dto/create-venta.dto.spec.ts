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
    it('should pass with valid data', async () => {
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

    it('should pass with multiple items', async () => {
      const dto = plainToInstance(CreateVentaDto, {
        ...validDto,
        items: [
          {
            producto_id: '550e8400-e29b-41d4-a716-446655440002',
            cantidad: 2,
          },
          {
            producto_id: '550e8400-e29b-41d4-a716-446655440003',
            cantidad: 5,
            precio_manual: 150.50,
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with multiple medios de pago (split ticket)', async () => {
      const dto = plainToInstance(CreateVentaDto, {
        ...validDto,
        medios_pago: [
          {
            medio_pago: 'efectivo',
            monto: 3000,
          },
          {
            medio_pago: 'debito',
            monto: 2000,
          },
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
      const dto = plainToInstance(CreateVentaDto, {
        ...validDto,
        caja_id: 'not-a-uuid',
      });

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
      expect(errors[0].property).toBe('items');
    });

    it('should fail if items is empty array', async () => {
      const dto = plainToInstance(CreateVentaDto, {
        ...validDto,
        items: [],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('items');
    });

    it('should fail if items is not an array', async () => {
      const dto = plainToInstance(CreateVentaDto, {
        ...validDto,
        items: 'not-an-array',
      });

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
      expect(errors[0].property).toBe('medios_pago');
    });

    it('should fail if medios_pago is empty array', async () => {
      const dto = plainToInstance(CreateVentaDto, {
        ...validDto,
        medios_pago: [],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('medios_pago');
    });

    it('should fail if transaccion_id is not a UUID', async () => {
      const dto = plainToInstance(CreateVentaDto, {
        ...validDto,
        transaccion_id: 'invalid-uuid',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('transaccion_id');
    });
  });
});
