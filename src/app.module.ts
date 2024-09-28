import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CustomCacheInterceptor } from 'cache/cache.interceptor';
import { RedisOptions } from 'cache/cache.options';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    UserModule,
    PrismaModule,
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    MailModule,
    CacheModule.registerAsync(RedisOptions),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR, // applies caching for all controllers
      useClass: CustomCacheInterceptor,
    },
  ],
})
export class AppModule {}
