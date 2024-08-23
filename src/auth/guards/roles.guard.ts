import { ROLES_KEY } from '@common/decorators';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, User } from '@prisma/client';
import { UserResponse } from '@user/responses';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const { body, user } = context.switchToHttp().getRequest();
    const isSelfUpdate = this.isSelfUpdate(body, user);

    if (!requiredRoles) {
      return true;
    }
    if (requiredRoles.some((role) => user.roles?.includes(role))) {
      return true;
    }
    if (isSelfUpdate) {
      return true;
    }
    return false;
  }

  private isSelfUpdate(body: Partial<User>, user: UserResponse): boolean {
    return body.id === user.id || body.email === user.email;
  }
}
