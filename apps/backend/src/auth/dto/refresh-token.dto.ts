import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { RefreshTokenRequest } from '@omnia/shared-types';

export class RefreshTokenDto implements RefreshTokenRequest {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  refresh_token: string;
}
