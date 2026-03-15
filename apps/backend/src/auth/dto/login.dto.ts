import { IsEmail, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import type { LoginRequest } from "@omnia/shared-types";

export class LoginDto implements LoginRequest {
  @ApiProperty({ example: "admin@omnia.com" })
  @IsEmail({}, { message: "Invalid email format" })
  email: string;

  @ApiProperty({ example: "Admin123!" })
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  password: string;
}
