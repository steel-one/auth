import { RegisterDto } from '@auth/dto';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsPasswordsMatching', async: false })
export class IsPasswordsMatchingConstraint
  implements ValidatorConstraintInterface
{
  validate(repeatPassword: string, args: ValidationArguments) {
    const obj = args.object as RegisterDto;
    return obj.password === repeatPassword;
  }

  defaultMessage(): string {
    return 'Пароли не совпадают';
  }
}
