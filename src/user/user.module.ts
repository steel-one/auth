import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
  imports: [CacheModule.register()],
})
export class UserModule {}
