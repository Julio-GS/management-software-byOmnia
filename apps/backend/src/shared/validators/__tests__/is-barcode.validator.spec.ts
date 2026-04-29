import { validate } from 'class-validator';
import { IsBarcode } from '../is-barcode.validator';

class TestDto {
  @IsBarcode({ message: 'Código de barras inválido' })
  barcode: string;
}

describe('IsBarcode Validator', () => {
  describe('EAN-13 format (13 digits)', () => {
    it('should pass for valid EAN-13 barcodes', async () => {
      const dto = new TestDto();
      dto.barcode = '7790001234561'; // 13 digits

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass for EAN-13 starting with zeros', async () => {
      const dto = new TestDto();
      dto.barcode = '0012345678905';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('EAN-8 format (8 digits)', () => {
    it('should pass for valid EAN-8 barcodes', async () => {
      const dto = new TestDto();
      dto.barcode = '12345670'; // 8 digits

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('UPC-A format (12 digits)', () => {
    it('should pass for valid UPC-A barcodes', async () => {
      const dto = new TestDto();
      dto.barcode = '123456789012'; // 12 digits

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('invalid formats', () => {
    it('should fail for barcodes with less than 8 digits', async () => {
      const dto = new TestDto();
      dto.barcode = '1234567'; // 7 digits

      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].constraints?.isBarcode).toBe('Código de barras inválido');
    });

    it('should fail for barcodes with 9-11 digits (invalid lengths)', async () => {
      const dto = new TestDto();
      dto.barcode = '123456789'; // 9 digits

      const errors = await validate(dto);
      expect(errors.length).toBe(1);
    });

    it('should fail for barcodes with more than 13 digits', async () => {
      const dto = new TestDto();
      dto.barcode = '12345678901234'; // 14 digits

      const errors = await validate(dto);
      expect(errors.length).toBe(1);
    });

    it('should fail for barcodes with letters', async () => {
      const dto = new TestDto();
      dto.barcode = '123ABC7890123';

      const errors = await validate(dto);
      expect(errors.length).toBe(1);
    });

    it('should fail for barcodes with special characters', async () => {
      const dto = new TestDto();
      dto.barcode = '1234-5678-9012';

      const errors = await validate(dto);
      expect(errors.length).toBe(1);
    });

    it('should fail for empty string', async () => {
      const dto = new TestDto();
      dto.barcode = '';

      const errors = await validate(dto);
      expect(errors.length).toBe(1);
    });

    it('should fail for barcodes with spaces', async () => {
      const dto = new TestDto();
      dto.barcode = '1234 5678 9012';

      const errors = await validate(dto);
      expect(errors.length).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should use default message if not provided', async () => {
      class DefaultMessageDto {
        @IsBarcode()
        barcode: string;
      }

      const dto = new DefaultMessageDto();
      dto.barcode = 'invalid';

      const errors = await validate(dto);
      expect(errors[0].constraints?.isBarcode).toBe(
        'barcode must be a valid barcode (EAN-8, EAN-13, or UPC-A)',
      );
    });

    it('should handle undefined values', async () => {
      const dto = new TestDto();
      (dto as any).barcode = undefined;

      const errors = await validate(dto);
      // Should not validate undefined (that's the job of @IsDefined or @IsNotEmpty)
      expect(errors.length).toBe(0);
    });

    it('should handle null values', async () => {
      const dto = new TestDto();
      (dto as any).barcode = null;

      const errors = await validate(dto);
      // Should not validate null (that's the job of @IsDefined or @IsNotEmpty)
      expect(errors.length).toBe(0);
    });
  });

  describe('real-world barcodes', () => {
    it('should validate common product barcodes', async () => {
      const validBarcodes = [
        '7790001234561', // EAN-13 (Argentina)
        '7891234567890', // EAN-13 (Brazil)
        '0012345678905', // UPC-A with leading zero
        '12345670',      // EAN-8
      ];

      for (const code of validBarcodes) {
        const dto = new TestDto();
        dto.barcode = code;
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });
  });
});
