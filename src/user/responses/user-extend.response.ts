import { Provider, Role, User } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class UserForAdminResponse implements User {
  id: string;

  email: string;

  firstName: string;

  lastName: string;

  @Exclude()
  password: string;

  @Exclude()
  createdAt: Date;

  @Exclude()
  provider: Provider;

  isBlocked: boolean;

  isConfirmed: boolean;

  updatedAt: Date;

  roles: Role[];

  constructor(user: User) {
    Object.assign(this, user);
  }
}
