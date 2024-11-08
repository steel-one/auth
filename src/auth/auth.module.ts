import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '@user/user.module';
import { MailService } from 'src/mail/mail.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { options } from './config';
import { GUARDS } from './guards';
import { STRATEGIES } from './strategies';

@Module({
  controllers: [AuthController],
  providers: [AuthService, ...STRATEGIES, ...GUARDS, MailService],
  imports: [
    PassportModule,
    JwtModule.registerAsync(options()),
    HttpModule,
    UserModule,
  ],
})
export class AuthModule {}
