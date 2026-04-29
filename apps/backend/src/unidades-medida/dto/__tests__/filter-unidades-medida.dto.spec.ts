import { validate } from 'class-validator';
import { FilterUnidadesMedidaDto } from '../filter-unidades-medida.dto';

describe('FilterUnidadesMedidaDto', () => {
  it('should pass with empty filters', async () => {
    const dto = new FilterUnidadesMedidaDto();

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with tipo filter', async () => {
    const dto = new FilterUnidadesMedidaDto();
    dto.tipo = 'peso';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with activo filter', async () => {
    const dto = new FilterUnidadesMedidaDto();
    dto.activo = true;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with all filters', async () => {
    const dto = new FilterUnidadesMedidaDto();
    dto.tipo = 'peso';
    dto.activo = true;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with invalid tipo', async () => {
    const dto = new FilterUnidadesMedidaDto();
    (dto as any).tipo = 'invalid';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});