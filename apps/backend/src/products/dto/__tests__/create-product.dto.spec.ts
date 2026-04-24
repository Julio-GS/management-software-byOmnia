import { validate } from 'class-validator';
import { Transform } from 'class-transformer';
import { plainToInstance } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min, IsUUID, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

// Minimal DTO classes for testing Spanish field validation
class TestCreateProductDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @IsNotEmpty()
  detalle: string;

  @IsString()
  @IsOptional()
  codigo_alternativo?: string;

  @IsString()
  @IsOptional()
  codigo_barras?: string;

  @IsUUID()
  @IsOptional()
  proveedor_id?: string;

  @IsUUID()
  @IsOptional()
  rubro_id?: string;

  @IsUUID()
  @IsOptional()
  unidad_medida_id?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  contenido?: number;

  @IsBoolean()
  @IsOptional()
  es_codigo_especial?: boolean;

  @IsBoolean()
  @IsOptional()
  requiere_precio_manual?: boolean;

  @IsBoolean()
  @IsOptional()
  maneja_lotes?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  costo?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  iva?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  precio_venta?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  stock_minimo?: number;

  @IsBoolean()
  @IsOptional()
  maneja_stock?: boolean;
}

describe('CreateProductDto (Spanish Fields)', () => {
  let dto: TestCreateProductDto;

  beforeEach(() => {
    dto = new TestCreateProductDto();
  });

  describe('required fields', () => {
    it('should reject empty codigo', async () => {
      dto.detalle = 'Test Product';
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'codigo')).toBe(true);
    });

    it('should reject empty detalle', async () => {
      dto.codigo = 'TEST-001';
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'detalle')).toBe(true);
    });

    it('should accept valid codigo and detalle', async () => {
      dto.codigo = 'TEST-001';
      dto.detalle = 'Test Product';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('optional fields', () => {
    it('should accept optional codigo_alternativo', async () => {
      dto.codigo = 'TEST-001';
      dto.detalle = 'Test Product';
      dto.codigo_alternativo = 'ALT-001';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept optional codigo_barras', async () => {
      dto.codigo = 'TEST-001';
      dto.detalle = 'Test Product';
      dto.codigo_barras = '7790895001567';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject negative costo', async () => {
      dto.codigo = 'TEST-001';
      dto.detalle = 'Test Product';
      dto.costo = -10;
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'costo')).toBe(true);
    });

    it('should reject negative precio_venta', async () => {
      dto.codigo = 'TEST-001';
      dto.detalle = 'Test Product';
      dto.precio_venta = -50;
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'precio_venta')).toBe(true);
    });
  });

  describe('boolean flags', () => {
    it('should accept es_codigo_especial flag', async () => {
      dto.codigo = 'TEST-001';
      dto.detalle = 'Test Product';
      dto.es_codigo_especial = true;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept requiere_precio_manual flag', async () => {
      dto.codigo = 'TEST-001';
      dto.detalle = 'Test Product';
      dto.requiere_precio_manual = true;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept maneja_lotes flag', async () => {
      dto.codigo = 'TEST-001';
      dto.detalle = 'Test Product';
      dto.maneja_lotes = true;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});