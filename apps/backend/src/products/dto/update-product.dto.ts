import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';
import type { UpdateProductDto as IUpdateProductDto } from '@omnia/shared-types';

// UpdateProductDto extends PartialType to make all fields optional (NestJS pattern)
// This implements the shared UpdateProductDto interface
export class UpdateProductDto extends PartialType(CreateProductDto) implements IUpdateProductDto {}
