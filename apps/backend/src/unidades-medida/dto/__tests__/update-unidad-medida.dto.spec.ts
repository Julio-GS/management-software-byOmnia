import { validate } from 'class-validator';
import { UpdateUnidadMedidaDto } from '../update-unidad-medida.dto';

describe('UpdateUnidadMedidaDto', () => {
  it('should pass with partial valid data', async () => {
    const dto = new UpdateUnidadMedidaDto();
    dto.nombre = 'Kilogramo';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with activo flag', async () => {
    const dto = new UpdateUnidadMedidaDto();
    dto.activo = false;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with all fields', async () => {
    const dto = new UpdateUnidadMedidaDto();
    dto.nombre = 'Kilogramo';
    dto.abreviatura = 'kg';
    dto.tipo = 'peso';
    dto.activo = true;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with empty object', async () => {
    const dto = new UpdateUnidadMedidaDto();

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with invalid tipo', async () => {
    const dto = new UpdateUnidadMedidaDto();
    (dto as any).tipo = 'invalid';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});