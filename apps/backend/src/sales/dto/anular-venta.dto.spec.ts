import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AnularVentaDto } from './anular-venta.dto';

describe('AnularVentaDto', () => {
  describe('Validation', () => {
    it('should pass with valid motivo', async () => {
      const dto = plainToInstance(AnularVentaDto, {
        motivo_anulacion: 'Error en el precio del producto',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail if motivo_anulacion is missing', async () => {
      const dto = plainToInstance(AnularVentaDto, {});

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('motivo_anulacion');
    });

    it('should fail if motivo_anulacion is too short', async () => {
      const dto = plainToInstance(AnularVentaDto, {
        motivo_anulacion: 'Error',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('motivo_anulacion');
    });

    it('should pass with exactly 10 characters', async () => {
      const dto = plainToInstance(AnularVentaDto, {
        motivo_anulacion: 'Error-1234',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
