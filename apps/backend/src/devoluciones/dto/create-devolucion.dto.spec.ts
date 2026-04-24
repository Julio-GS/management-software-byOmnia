import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateDevolucionDto } from './create-devolucion.dto';

describe('CreateDevolucionDto', () => {
  describe('valid DTO', () => {
    it('should pass validation with all required fields', async () => {
      const dto = plainToInstance(CreateDevolucionDto, {
        venta_id: '123e4567-e89b-12d3-a456-426614174000',
        producto_id: '123e4567-e89b-12d3-a456-426614174001',
        cantidad: 5,
        tipo_devolucion: 'efectivo',
        medio_devolucion: 'efectivo',
        motivo: 'Producto defectuoso',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with optional lote_id', async () => {
      const dto = plainToInstance(CreateDevolucionDto, {
        venta_id: '123e4567-e89b-12d3-a456-426614174000',
        producto_id: '123e4567-e89b-12d3-a456-426614174001',
        lote_id: '123e4567-e89b-12d3-a456-426614174002',
        cantidad: 5,
        tipo_devolucion: 'efectivo',
        medio_devolucion: 'efectivo',
        motivo: 'Producto defectuoso',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with optional observaciones', async () => {
      const dto = plainToInstance(CreateDevolucionDto, {
        venta_id: '123e4567-e89b-12d3-a456-426614174000',
        producto_id: '123e4567-e89b-12d3-a456-426614174001',
        cantidad: 5,
        tipo_devolucion: 'efectivo',
        medio_devolucion: 'efectivo',
        motivo: 'Producto defectuoso',
        observaciones: 'Cliente insatisfecho con calidad',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept all valid tipo_devolucion values', async () => {
      const tipos = ['efectivo', 'transferencia', 'nota_credito'];
      
      for (const tipo of tipos) {
        const dto = plainToInstance(CreateDevolucionDto, {
          venta_id: '123e4567-e89b-12d3-a456-426614174000',
          producto_id: '123e4567-e89b-12d3-a456-426614174001',
          cantidad: 5,
          tipo_devolucion: tipo,
          medio_devolucion: tipo,
          motivo: 'Producto defectuoso',
        });

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });
  });

  describe('invalid venta_id', () => {
    it('should fail when venta_id is missing', async () => {
      const dto = plainToInstance(CreateDevolucionDto, {
        producto_id: '123e4567-e89b-12d3-a456-426614174001',
        cantidad: 5,
        tipo_devolucion: 'efectivo',
        medio_devolucion: 'efectivo',
        motivo: 'Producto defectuoso',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('venta_id');
    });

    it('should fail when venta_id is not a valid UUID', async () => {
      const dto = plainToInstance(CreateDevolucionDto, {
        venta_id: 'invalid-uuid',
        producto_id: '123e4567-e89b-12d3-a456-426614174001',
        cantidad: 5,
        tipo_devolucion: 'efectivo',
        medio_devolucion: 'efectivo',
        motivo: 'Producto defectuoso',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('venta_id');
    });
  });

  describe('invalid producto_id', () => {
    it('should fail when producto_id is missing', async () => {
      const dto = plainToInstance(CreateDevolucionDto, {
        venta_id: '123e4567-e89b-12d3-a456-426614174000',
        cantidad: 5,
        tipo_devolucion: 'efectivo',
        medio_devolucion: 'efectivo',
        motivo: 'Producto defectuoso',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('producto_id');
    });

    it('should fail when producto_id is not a valid UUID', async () => {
      const dto = plainToInstance(CreateDevolucionDto, {
        venta_id: '123e4567-e89b-12d3-a456-426614174000',
        producto_id: 'not-a-uuid',
        cantidad: 5,
        tipo_devolucion: 'efectivo',
        medio_devolucion: 'efectivo',
        motivo: 'Producto defectuoso',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('producto_id');
    });
  });

  describe('invalid cantidad', () => {
    it('should fail when cantidad is missing', async () => {
      const dto = plainToInstance(CreateDevolucionDto, {
        venta_id: '123e4567-e89b-12d3-a456-426614174000',
        producto_id: '123e4567-e89b-12d3-a456-426614174001',
        tipo_devolucion: 'efectivo',
        medio_devolucion: 'efectivo',
        motivo: 'Producto defectuoso',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('cantidad');
    });

    it('should fail when cantidad is not a number', async () => {
      const dto = plainToInstance(CreateDevolucionDto, {
        venta_id: '123e4567-e89b-12d3-a456-426614174000',
        producto_id: '123e4567-e89b-12d3-a456-426614174001',
        cantidad: 'cinco',
        tipo_devolucion: 'efectivo',
        medio_devolucion: 'efectivo',
        motivo: 'Producto defectuoso',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('cantidad');
    });

    it('should fail when cantidad is zero', async () => {
      const dto = plainToInstance(CreateDevolucionDto, {
        venta_id: '123e4567-e89b-12d3-a456-426614174000',
        producto_id: '123e4567-e89b-12d3-a456-426614174001',
        cantidad: 0,
        tipo_devolucion: 'efectivo',
        medio_devolucion: 'efectivo',
        motivo: 'Producto defectuoso',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('cantidad');
    });

    it('should fail when cantidad is negative', async () => {
      const dto = plainToInstance(CreateDevolucionDto, {
        venta_id: '123e4567-e89b-12d3-a456-426614174000',
        producto_id: '123e4567-e89b-12d3-a456-426614174001',
        cantidad: -5,
        tipo_devolucion: 'efectivo',
        medio_devolucion: 'efectivo',
        motivo: 'Producto defectuoso',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('cantidad');
    });
  });

  describe('invalid tipo_devolucion', () => {
    it('should fail when tipo_devolucion is missing', async () => {
      const dto = plainToInstance(CreateDevolucionDto, {
        venta_id: '123e4567-e89b-12d3-a456-426614174000',
        producto_id: '123e4567-e89b-12d3-a456-426614174001',
        cantidad: 5,
        medio_devolucion: 'efectivo',
        motivo: 'Producto defectuoso',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('tipo_devolucion');
    });

    it('should fail when tipo_devolucion is invalid', async () => {
      const dto = plainToInstance(CreateDevolucionDto, {
        venta_id: '123e4567-e89b-12d3-a456-426614174000',
        producto_id: '123e4567-e89b-12d3-a456-426614174001',
        cantidad: 5,
        tipo_devolucion: 'tarjeta_credito',
        medio_devolucion: 'efectivo',
        motivo: 'Producto defectuoso',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('tipo_devolucion');
    });
  });

  describe('invalid medio_devolucion', () => {
    it('should fail when medio_devolucion is missing', async () => {
      const dto = plainToInstance(CreateDevolucionDto, {
        venta_id: '123e4567-e89b-12d3-a456-426614174000',
        producto_id: '123e4567-e89b-12d3-a456-426614174001',
        cantidad: 5,
        tipo_devolucion: 'efectivo',
        motivo: 'Producto defectuoso',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('medio_devolucion');
    });

    it('should fail when medio_devolucion is invalid', async () => {
      const dto = plainToInstance(CreateDevolucionDto, {
        venta_id: '123e4567-e89b-12d3-a456-426614174000',
        producto_id: '123e4567-e89b-12d3-a456-426614174001',
        cantidad: 5,
        tipo_devolucion: 'efectivo',
        medio_devolucion: 'cheque',
        motivo: 'Producto defectuoso',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('medio_devolucion');
    });
  });

  describe('invalid motivo', () => {
    it('should fail when motivo is missing', async () => {
      const dto = plainToInstance(CreateDevolucionDto, {
        venta_id: '123e4567-e89b-12d3-a456-426614174000',
        producto_id: '123e4567-e89b-12d3-a456-426614174001',
        cantidad: 5,
        tipo_devolucion: 'efectivo',
        medio_devolucion: 'efectivo',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('motivo');
    });

    it('should fail when motivo is too short', async () => {
      const dto = plainToInstance(CreateDevolucionDto, {
        venta_id: '123e4567-e89b-12d3-a456-426614174000',
        producto_id: '123e4567-e89b-12d3-a456-426614174001',
        cantidad: 5,
        tipo_devolucion: 'efectivo',
        medio_devolucion: 'efectivo',
        motivo: 'Malo',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('motivo');
    });

    it('should fail when motivo is not a string', async () => {
      const dto = plainToInstance(CreateDevolucionDto, {
        venta_id: '123e4567-e89b-12d3-a456-426614174000',
        producto_id: '123e4567-e89b-12d3-a456-426614174001',
        cantidad: 5,
        tipo_devolucion: 'efectivo',
        medio_devolucion: 'efectivo',
        motivo: 12345,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('motivo');
    });
  });

  describe('optional lote_id', () => {
    it('should fail when lote_id is provided but not a valid UUID', async () => {
      const dto = plainToInstance(CreateDevolucionDto, {
        venta_id: '123e4567-e89b-12d3-a456-426614174000',
        producto_id: '123e4567-e89b-12d3-a456-426614174001',
        lote_id: 'invalid-lote-id',
        cantidad: 5,
        tipo_devolucion: 'efectivo',
        medio_devolucion: 'efectivo',
        motivo: 'Producto defectuoso',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('lote_id');
    });
  });
});
