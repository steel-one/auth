import { IsPasswordsMatchingConstraint } from '@common/decorators';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  MinLength,
  Validate,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @MinLength(1)
  @IsNotEmpty()
  last_name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsStrongPassword({
    minLength: 8,
    minUppercase: 1,
    minLowercase: 1,
    minNumbers: 1,
  })
  password: string;

  @IsString()
  @Validate(IsPasswordsMatchingConstraint)
  repeat_password: string;
}
