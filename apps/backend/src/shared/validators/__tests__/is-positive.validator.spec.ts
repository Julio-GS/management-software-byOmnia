import { validate } from 'class-validator';
import { IsPositive } from '../is-positive.validator';

class TestDto {
  @IsPositive({ message: 'El valor debe ser positivo' })
  value: number;
}

describe('IsPositive Validator', () => {
  it('should pass for positive numbers', async () => {
    const dto = new TestDto();
    dto.value = 10;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass for positive decimals', async () => {
    const dto = new TestDto();
    dto.value = 0.5;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail for zero', async () => {
    const dto = new TestDto();
    dto.value = 0;

    const errors = await validate(dto);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('isPositive');
    expect(errors[0].constraints?.isPositive).toBe('El valor debe ser positivo');
  });

  it('should fail for negative numbers', async () => {
    const dto = new TestDto();
    dto.value = -5;

    const errors = await validate(dto);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints?.isPositive).toBe('El valor debe ser positivo');
  });

  it('should fail for negative decimals', async () => {
    const dto = new TestDto();
    dto.value = -0.01;

    const errors = await validate(dto);
    expect(errors.length).toBe(1);
  });

  it('should use default message if not provided', async () => {
    class DefaultMessageDto {
      @IsPositive()
      value: number;
    }

    const dto = new DefaultMessageDto();
    dto.value = -1;

    const errors = await validate(dto);
    expect(errors[0].constraints?.isPositive).toBe('value must be a positive number');
  });

  it('should handle undefined values', async () => {
    const dto = new TestDto();
    (dto as any).value = undefined;

    const errors = await validate(dto);
    // Should not validate undefined (that's the job of @IsDefined or @IsNotEmpty)
    expect(errors.length).toBe(0);
  });

  it('should handle null values', async () => {
    const dto = new TestDto();
    (dto as any).value = null;

    const errors = await validate(dto);
    // Should not validate null (that's the job of @IsDefined or @IsNotEmpty)
    expect(errors.length).toBe(0);
  });
});
