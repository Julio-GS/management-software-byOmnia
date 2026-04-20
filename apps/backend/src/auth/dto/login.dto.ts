import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import type { LoginRequest } from "@omnia/shared-types";

export class LoginDto implements LoginRequest {
  @ApiProperty({ example: "admin" })
  @IsString({ message: "Username must be a string" })
  @MinLength(3, { message: "Username must be at least 3 characters long" })
  username: string;

  @ApiProperty({ example: "Admin123!" })
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  password: string;
}
