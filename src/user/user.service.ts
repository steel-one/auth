import { JwtPayload } from '@auth/interfaces';
import { ListDto } from '@common/serializers/common';
import { convertToSecondsUtil } from '@common/utils';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { genSaltSync, hashSync } from 'bcrypt';
import { Cache } from 'cache-manager';

export interface IData {
  nodes: User[];
  total: number;
}

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  async save(user: Partial<User>): Promise<User> {
    const hashedPassword = user?.password
      ? this.hashPassword(user.password)
      : null;
    const savedUser = await this.prismaService.user.upsert({
      where: {
        email: user.email,
      },
      update: {
        firstName: user?.firstName ?? undefined,
        lastName: user?.lastName ?? undefined,
        password: hashedPassword ?? undefined,
        provider: user?.provider ?? undefined,
        roles: user?.roles ?? undefined,
        isBlocked: user.isBlocked ?? undefined,
        isConfirmed: user.isConfirmed ?? undefined,
      },
      create: {
        firstName: user?.firstName ?? undefined,
        lastName: user?.lastName ?? undefined,
        email: user.email,
        password: hashedPassword,
        provider: user?.provider,
        roles: ['USER'],
      },
    });
    await this.cacheManager.set(savedUser.id, savedUser);
    await this.cacheManager.set(savedUser.email, savedUser);
    return savedUser;
  }

  async findOne(idOrEmail: string, isReset = false) {
    if (isReset) {
      await this.cacheManager.del(idOrEmail);
    }
    const user = await this.cacheManager.get<User>(idOrEmail);
    if (!user) {
      const user = await this.prismaService.user.findFirst({
        where: {
          OR: [{ id: idOrEmail }, { email: idOrEmail }],
        },
      });
      if (!user) {
        return null;
      }
      await this.cacheManager.set(
        idOrEmail,
        user,
        convertToSecondsUtil(this.configService.get('JWT_EXP')),
      );
      return user;
    }
    return user;
  }

  async findManyAndCount(payload: ListDto): Promise<IData> {
    const query: Prisma.UserFindManyArgs = {
      take: payload.paginate.perPage,
      orderBy: {
        [payload.orderBy.sort]: payload.orderBy.order,
      },
    };
    if (payload?.search.length) {
      query.where = {
        OR: [
          { firstName: { contains: payload.search, mode: 'insensitive' } },
          { lastName: { contains: payload.search, mode: 'insensitive' } },
          { email: { contains: payload.search, mode: 'insensitive' } },
        ],
      };
    }
    const [nodes, total] = await this.prismaService.$transaction([
      this.prismaService.user.findMany(query),
      this.prismaService.user.count({ where: query.where ?? undefined }),
    ]);
    if (!nodes) {
      return null;
    }
    return { nodes, total };
  }

  async delete(id: string, user: JwtPayload) {
    if (user.id !== id && !user.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException();
    }
    await Promise.all([
      this.cacheManager.del(id),
      this.cacheManager.del(user.email),
    ]);
    return this.prismaService.user.delete({
      where: { id },
      select: { id: true },
    });
  }

  private hashPassword(password: string) {
    return hashSync(password, genSaltSync(10));
  }
}
