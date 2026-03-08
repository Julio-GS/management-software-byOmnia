import { ApiProperty } from '@nestjs/swagger';

export class PriceCalculationResultDto {
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
  markupSource: 'product' | 'category' | 'global';
}
