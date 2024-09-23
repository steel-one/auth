import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @MinLength(3)
  @IsOptional()
  firstName: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  lastName: string;

  @IsEmail()
  @IsOptional()
  email: string;
}
