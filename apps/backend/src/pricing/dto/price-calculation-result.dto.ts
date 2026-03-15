import { ApiProperty } from '@nestjs/swagger';
import type { PriceCalculationResult, MarkupSource } from '@omnia/shared-types';

// This DTO represents the shared PriceCalculationResult interface
// No validation needed - this is a response type
export class PriceCalculationResultDto implements PriceCalculationResult {
  @ApiProperty({
    description: 'Calculated price (cost * (1 + markup%))',
    example: 130.5,
  })
  calculatedPrice: number;

  @ApiProperty({
    description: 'Suggested price with smart rounding applied',
    example: 130,
  })
  suggestedPrice: number;

  @ApiProperty({
    description: 'Markup percentage used in calculation',
    example: 30,
  })
  markupPercentage: number;

  @ApiProperty({
    description: 'Source of the markup used',
    enum: ['product', 'category', 'global'],
    example: 'global',
  })
  markupSource: MarkupSource;
}
