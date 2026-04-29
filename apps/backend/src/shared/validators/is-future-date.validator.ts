import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validator decorator: IsFutureDate
 * 
 * Validates that a date is in the future (strictly greater than now).
 * Skips validation for null/undefined values (use @IsDefined/@IsNotEmpty for that).
 * 
 * @example
 * ```typescript
 * class CreateLoteDto {
 *   @IsFutureDate({ message: 'La fecha de vencimiento debe ser futura' })
 *   fecha_vencimiento: Date;
 * }
 * ```
 */
export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Skip validation for null/undefined
          if (value === null || value === undefined) {
            return true;
          }

          // Must be a valid Date object
          if (!(value instanceof Date)) {
            return false;
          }

          // Check if valid date (not NaN)
          if (isNaN(value.getTime())) {
            return false;
          }

          // Must be in the future (strictly > now)
          return value.getTime() > Date.now();
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a future date`;
        },
      },
    });
  };
}
