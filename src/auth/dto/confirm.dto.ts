import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ConfirmDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(3)
  code: string;
}
