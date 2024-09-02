import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  providers: [MailService],
  imports: [CacheModule.register()],
})
export class MailModule {}
