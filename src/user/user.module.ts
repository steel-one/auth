import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { RolesGuard } from '@auth/guards/roles.guard';

@Module({
  providers: [UserService, RolesGuard],
  controllers: [UserController],
  exports: [UserService],
  imports: [CacheModule.register()],
})
export class UserModule {}
