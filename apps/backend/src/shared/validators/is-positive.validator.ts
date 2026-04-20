import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validator decorator: IsPositive
 * 
 * Validates that a number is positive (greater than 0).
 * Skips validation for null/undefined values (use @IsDefined/@IsNotEmpty for that).
 * 
 * @example
 * ```typescript
 * class CreateProductDto {
 *   @IsPositive({ message: 'El precio debe ser positivo' })
 *   precio: number;
 * }
 * ```
 */
export function IsPositive(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPositive',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Skip validation for null/undefined
          if (value === null || value === undefined) {
            return true;
          }

          // Must be a number and > 0
          return typeof value === 'number' && !isNaN(value) && value > 0;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a positive number`;
        },
      },
    });
  };
}
