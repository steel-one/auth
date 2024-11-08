import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Provider, Token, User } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { UserService } from '@user/user.service';
import { compareSync } from 'bcrypt';
import { Cache } from 'cache-manager';
import { randomInt } from 'crypto';
import { add } from 'date-fns';
import { MailService } from 'src/mail/mail.service';
import { v4 } from 'uuid';
import { LoginDto, RegisterDto } from './dto';
import { RecoverRequestDto } from './dto/recover-request.dto';
import { RecoverDto } from './dto/recover.dto';
import { Tokens } from './interfaces';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async refreshTokens(refreshToken: string, agent: string): Promise<Tokens> {
    const token = await this.prismaService.token.delete({
      where: { token: refreshToken },
    });
    if (!token || new Date(token.exp) < new Date()) {
      throw new UnauthorizedException();
    }
    const user = await this.userService.findOne(token.userId);
    return this.generateTokens(user, agent);
  }

  async singUp(dto: RegisterDto) {
    const user: User = await this.userService
      .findOne(dto.email)
      .catch((err) => {
        this.logger.error(err);
        return null;
      });
    if (user) {
      throw new ConflictException(
        'Пользователь с таким email уже зарегистрирован',
      );
    }
    const code = randomInt(100000).toString();
    const link = `<a href="${process.env.UI_ENDPOINT}/confirm?email=${dto.email}&code=${code}">CONFIRM</a>`;
    await this.cacheManager.set(dto.email, code);
    await this.mailService.sendUserConfirmation(
      { email: dto.email, code, name: dto.firstName },
      link,
    );
    return this.userService.save(dto).catch((err) => {
      this.logger.error(err);
      return null;
    });
  }

  async confirm(confirmData) {
    const cachedCode = await this.cacheManager.get(confirmData.email);
    if (cachedCode === confirmData.code) {
      const user: User = await this.userService
        .findOne(confirmData.email)
        .catch((err) => {
          this.logger.error(err);
          return null;
        });
      this.userService
        .save({
          ...user,
          isConfirmed: true,
        })
        .catch((err) => {
          this.logger.error(err);
          return null;
        });
      return user;
    }
  }

  async requestRecovery(dto: RecoverRequestDto, agent: string) {
    const user = await this.userService.findOne(dto.email);
    if (user?.provider) {
      throw new UnprocessableEntityException(`No need to reset your password because your account is social! 
        Please use OAuth like Google, Yandex, etc!`);
    }
    const code = randomInt(100000).toString();
    const link = `<a href="${process.env.UI_ENDPOINT}/password?email=${dto.email}&code=${code}&recovery=true">CONFIRM</a>`;
    await this.cacheManager.set(dto.email, code);
    await this.mailService.sendRecoveryInstructions(dto.email, link, agent);
  }

  async recover(dto: RecoverDto) {
    const user: User = await this.userService
      .findOne(dto.email, true)
      .catch((err) => {
        this.logger.error(err);
        return null;
      });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    const savedUser = await this.userService.save({
      ...dto,
      isConfirmed: true,
    });
    return savedUser;
  }

  async login(dto: LoginDto, agent: string): Promise<Tokens> {
    const user: User = await this.userService
      .findOne(dto.email, true)
      .catch((err) => {
        this.logger.error(err);
        return null;
      });
    if (!user || !compareSync(dto.password, user.password)) {
      throw new UnauthorizedException('Не верный логин или пароль');
    }
    if (!user?.isConfirmed) {
      throw new UnauthorizedException('Сперва подтвердите почту пожалуйста');
    }
    return this.generateTokens(user, agent);
  }

  async generateTokens(user: User, agent: string): Promise<Tokens> {
    const accessToken =
      'Bearer ' +
      this.jwtService.sign({
        id: user.id,
        email: user.email,
        roles: user.roles,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    const refreshToken = await this.getRefreshToken(user.id, agent);
    return { accessToken, refreshToken };
  }

  private async getRefreshToken(userId: string, agent: string): Promise<Token> {
    const _token = await this.prismaService.token.findFirst({
      where: { userId, userAgent: agent },
    });
    const token = _token?.token ?? '';
    return this.prismaService.token.upsert({
      where: { token },
      update: {
        token: v4(),
        exp: add(new Date(), { months: 1 }),
      },
      create: {
        token: v4(),
        exp: add(new Date(), { months: 1 }),
        userId,
        userAgent: agent,
      },
    });
  }

  // only for a device where you triggered Logout
  deleteRefreshToken(token: string) {
    return this.prismaService.token.delete({ where: { token } });
  }

  async providerAuth(email: string, agent: string, provider: Provider) {
    const userExists = await this.userService.findOne(email);
    if (userExists) {
      const user = await this.userService
        .save({ email, provider })
        .catch((err) => {
          this.logger.error(err);
          return null;
        });
      return this.generateTokens(user, agent);
    }
    const user = await this.userService
      .save({ email, provider })
      .catch((err) => {
        this.logger.error(err);
        return null;
      });
    if (!user) {
      throw new HttpException(
        `Не получилось создать пользователя с email ${email} в Google auth`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.generateTokens(user, agent);
  }
}
