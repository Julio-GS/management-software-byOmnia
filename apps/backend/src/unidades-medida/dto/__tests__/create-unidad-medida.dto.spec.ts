import { validate } from 'class-validator';
import { CreateUnidadMedidaDto } from '../create-unidad-medida.dto';

describe('CreateUnidadMedidaDto', () => {
  it('should pass with valid data', async () => {
    const dto = new CreateUnidadMedidaDto();
    dto.nombre = 'Kilogramo';
    dto.abreviatura = 'kg';
    dto.tipo = 'peso';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass without optional tipo', async () => {
    const dto = new CreateUnidadMedidaDto();
    dto.nombre = 'Unidad';
    dto.abreviatura = 'u';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with empty nombre', async () => {
    const dto = new CreateUnidadMedidaDto();
    dto.nombre = '';
    dto.abreviatura = 'kg';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with empty abreviatura', async () => {
    const dto = new CreateUnidadMedidaDto();
    dto.nombre = 'Kilogramo';
    dto.abreviatura = '';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid tipo', async () => {
    const dto = new CreateUnidadMedidaDto();
    dto.nombre = 'Test';
    dto.abreviatura = 'T';
    (dto as any).tipo = 'invalid_tipo';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with too long nombre', async () => {
    const dto = new CreateUnidadMedidaDto();
    dto.nombre = 'a'.repeat(51);
    dto.abreviatura = 'kg';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with too long abreviatura', async () => {
    const dto = new CreateUnidadMedidaDto();
    dto.nombre = 'Kilogramo';
    dto.abreviatura = 'a'.repeat(11);

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});