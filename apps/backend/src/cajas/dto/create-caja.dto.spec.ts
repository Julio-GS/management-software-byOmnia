import { validate } from 'class-validator';
import { CreateCajaDto } from './create-caja.dto';

describe('CreateCajaDto', () => {
  describe('Validation', () => {
    it('should pass with valid data', async () => {
      const dto = new CreateCajaDto();
      dto.numero = 1;
      dto.nombre = 'Caja 1';
      dto.descripcion = 'Caja principal';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass without optional descripcion', async () => {
      const dto = new CreateCajaDto();
      dto.numero = 1;
      dto.nombre = 'Caja Express';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail if numero is missing', async () => {
      const dto = new CreateCajaDto();
      dto.nombre = 'Caja 1';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('numero');
    });

    it('should fail if numero is not an integer', async () => {
      const dto = new CreateCajaDto();
      dto.numero = 1.5 as any;
      dto.nombre = 'Caja 1';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('numero');
    });

    it('should fail if numero is less than 1', async () => {
      const dto = new CreateCajaDto();
      dto.numero = 0;
      dto.nombre = 'Caja 1';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('numero');
    });

    it('should fail if nombre is missing', async () => {
      const dto = new CreateCajaDto();
      dto.numero = 1;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('nombre');
    });

    it('should fail if nombre is too short', async () => {
      const dto = new CreateCajaDto();
      dto.numero = 1;
      dto.nombre = 'C';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('nombre');
    });

    it('should fail if nombre exceeds 100 characters', async () => {
      const dto = new CreateCajaDto();
      dto.numero = 1;
      dto.nombre = 'C'.repeat(101);

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('nombre');
    });

    it('should fail if descripcion is not a string', async () => {
      const dto = new CreateCajaDto();
      dto.numero = 1;
      dto.nombre = 'Caja 1';
      dto.descripcion = 123 as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('descripcion');
    });
  });
});
