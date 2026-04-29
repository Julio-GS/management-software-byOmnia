import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validator decorator: IsBarcode
 * 
 * Validates barcode formats:
 * - EAN-13: 13 digits
 * - EAN-8: 8 digits
 * - UPC-A: 12 digits
 * 
 * Skips validation for null/undefined values (use @IsDefined/@IsNotEmpty for that).
 * 
 * @example
 * ```typescript
 * class CreateProductDto {
 *   @IsBarcode({ message: 'Código de barras inválido' })
 *   codigo_barra: string;
 * }
 * ```
 */
export function IsBarcode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isBarcode',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Skip validation for null/undefined
          if (value === null || value === undefined) {
            return true;
          }

          // Must be a string
          if (typeof value !== 'string') {
            return false;
          }

          // Must be all digits
          if (!/^\d+$/.test(value)) {
            return false;
          }

          // Must be one of the valid lengths: 8 (EAN-8), 12 (UPC-A), 13 (EAN-13)
          const validLengths = [8, 12, 13];
          return validLengths.includes(value.length);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid barcode (EAN-8, EAN-13, or UPC-A)`;
        },
      },
    });
  };
}
