import { IsEmail, IsNotEmpty } from 'class-validator';

export class RecoverRequestDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
