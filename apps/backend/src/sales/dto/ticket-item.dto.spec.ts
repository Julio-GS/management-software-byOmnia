import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { TicketItemDto } from './ticket-item.dto';

describe('TicketItemDto', () => {
  describe('Validation', () => {
    it('should pass with valid data', async () => {
      const dto = plainToInstance(TicketItemDto, {
        producto_id: '550e8400-e29b-41d4-a716-446655440001',
        cantidad: 2.5,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with all optional fields', async () => {
      const dto = plainToInstance(TicketItemDto, {
        producto_id: '550e8400-e29b-41d4-a716-446655440001',
        lote_id: '550e8400-e29b-41d4-a716-446655440002',
        cantidad: 1,
        precio_manual: 150.50,
        promocion_id: '550e8400-e29b-41d4-a716-446655440003',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail if producto_id is missing', async () => {
      const dto = plainToInstance(TicketItemDto, {
        cantidad: 1,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('producto_id');
    });

    it('should fail if producto_id is not a UUID', async () => {
      const dto = plainToInstance(TicketItemDto, {
        producto_id: 'not-a-uuid',
        cantidad: 1,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('producto_id');
    });

    it('should fail if cantidad is missing', async () => {
      const dto = plainToInstance(TicketItemDto, {
        producto_id: '550e8400-e29b-41d4-a716-446655440001',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('cantidad');
    });

    it('should fail if cantidad is zero', async () => {
      const dto = plainToInstance(TicketItemDto, {
        producto_id: '550e8400-e29b-41d4-a716-446655440001',
        cantidad: 0,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('cantidad');
    });

    it('should fail if cantidad is negative', async () => {
      const dto = plainToInstance(TicketItemDto, {
        producto_id: '550e8400-e29b-41d4-a716-446655440001',
        cantidad: -1,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('cantidad');
    });

    it('should fail if precio_manual is below 0.01', async () => {
      const dto = plainToInstance(TicketItemDto, {
        producto_id: '550e8400-e29b-41d4-a716-446655440001',
        cantidad: 1,
        precio_manual: 0.005,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('precio_manual');
    });

    it('should fail if precio_manual exceeds 999999', async () => {
      const dto = plainToInstance(TicketItemDto, {
        producto_id: '550e8400-e29b-41d4-a716-446655440001',
        cantidad: 1,
        precio_manual: 1000000,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('precio_manual');
    });

    it('should fail if lote_id is not a UUID', async () => {
      const dto = plainToInstance(TicketItemDto, {
        producto_id: '550e8400-e29b-41d4-a716-446655440001',
        lote_id: 'invalid-uuid',
        cantidad: 1,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('lote_id');
    });

    it('should fail if promocion_id is not a UUID', async () => {
      const dto = plainToInstance(TicketItemDto, {
        producto_id: '550e8400-e29b-41d4-a716-446655440001',
        cantidad: 1,
        promocion_id: 'invalid-uuid',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('promocion_id');
    });
  });
});
