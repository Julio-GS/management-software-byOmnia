import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  Matches,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import type { RegisterRequest } from "@omnia/shared-types";
import { UserRole } from "@omnia/shared-types";

export class CreateUserDto implements RegisterRequest {
  @ApiProperty({ example: "john.doe@omnia.com" })
  @IsEmail({}, { message: "Invalid email format" })
  email: string;

  @ApiProperty({ example: "SecurePassword123!" })
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      "Password must contain uppercase, lowercase, number and special character",
  })
  password: string;

  @ApiProperty({ example: "John" })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: "Doe" })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: "cashier", enum: UserRole })
  @IsEnum(UserRole, {
    message: "Role must be one of: admin, manager, cashier",
  })
  @IsOptional()
  role?: UserRole;
}
