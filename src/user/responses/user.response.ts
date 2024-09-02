import { Provider, Role, User } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class UserResponse implements User {
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

  @Exclude()
  isBlocked: boolean;

  @Exclude()
  isConfirmed: boolean;

  updatedAt: Date;

  roles: Role[];

  constructor(user: User) {
    Object.assign(this, user);
  }
}
