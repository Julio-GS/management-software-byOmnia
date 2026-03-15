import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelSaleDto {
  @ApiProperty({ required: false, example: 'Cliente solicitó cancelación' })
  @IsOptional()
  @IsString()
  reason?: string;
}
