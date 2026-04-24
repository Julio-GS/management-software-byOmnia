import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

// UpdateProductDto extends PartialType to make all fields optional (NestJS pattern)
// Spanish field names match CreateProductDto (codigo, detalle, precio_venta, etc.)
export class UpdateProductDto extends PartialType(CreateProductDto) {}
