import { validate } from 'class-validator';
import { IsFutureDate } from '../is-future-date.validator';

class TestDto {
  @IsFutureDate({ message: 'La fecha debe ser futura' })
  date: Date;
}

describe('IsFutureDate Validator', () => {
  beforeAll(() => {
    // Mock Date.now() to have a stable reference
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should pass for future dates', async () => {
    const dto = new TestDto();
    dto.date = new Date('2024-12-31T23:59:59Z');

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass for dates 1 second in the future', async () => {
    const dto = new TestDto();
    dto.date = new Date('2024-01-15T10:00:01Z');

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail for past dates', async () => {
    const dto = new TestDto();
    dto.date = new Date('2020-01-01T00:00:00Z');

    const errors = await validate(dto);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('isFutureDate');
    expect(errors[0].constraints?.isFutureDate).toBe('La fecha debe ser futura');
  });

  it('should fail for the current moment', async () => {
    const dto = new TestDto();
    dto.date = new Date('2024-01-15T10:00:00Z'); // Exactly now

    const errors = await validate(dto);
    expect(errors.length).toBe(1);
  });

  it('should fail for dates 1 second in the past', async () => {
    const dto = new TestDto();
    dto.date = new Date('2024-01-15T09:59:59Z');

    const errors = await validate(dto);
    expect(errors.length).toBe(1);
  });

  it('should use default message if not provided', async () => {
    class DefaultMessageDto {
      @IsFutureDate()
      date: Date;
    }

    const dto = new DefaultMessageDto();
    dto.date = new Date('2020-01-01T00:00:00Z');

    const errors = await validate(dto);
    expect(errors[0].constraints?.isFutureDate).toBe('date must be a future date');
  });

  it('should handle undefined values', async () => {
    const dto = new TestDto();
    (dto as any).date = undefined;

    const errors = await validate(dto);
    // Should not validate undefined (that's the job of @IsDefined or @IsNotEmpty)
    expect(errors.length).toBe(0);
  });

  it('should handle null values', async () => {
    const dto = new TestDto();
    (dto as any).date = null;

    const errors = await validate(dto);
    // Should not validate null (that's the job of @IsDefined or @IsNotEmpty)
    expect(errors.length).toBe(0);
  });

  it('should handle invalid date objects', async () => {
    const dto = new TestDto();
    dto.date = new Date('invalid');

    const errors = await validate(dto);
    expect(errors.length).toBe(1);
  });

  it('should accept Date instances', async () => {
    const dto = new TestDto();
    dto.date = new Date(Date.now() + 86400000); // Tomorrow

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
