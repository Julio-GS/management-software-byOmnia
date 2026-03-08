import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';
import type { UpdateCategoryDto as IUpdateCategoryDto } from '@omnia/shared-types';

// UpdateCategoryDto extends PartialType to make all fields optional (NestJS pattern)
// This implements the shared UpdateCategoryDto interface
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) implements IUpdateCategoryDto {}
