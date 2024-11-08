import { Cookie, Public, UserAgent } from '@common/decorators';
import { handleTimeoutAndErrors } from '@common/helpers';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Provider } from '@prisma/client';
import { UserResponse } from '@user/responses';
import { Request, Response } from 'express';
import { map, mergeMap } from 'rxjs';
import { AuthService } from './auth.service';
import { ConfirmDto, LoginDto, RegisterDto } from './dto';
import { RecoverRequestDto } from './dto/recover-request.dto';
import { RecoverDto } from './dto/recover.dto';
import { GoogleGuard } from './guards/google.guard';
import { YandexGuard } from './guards/yandex.guard';
import { Tokens } from './interfaces';

const REFRESH_TOKEN = 'refreshtoken';

@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Post('sing-up')
  async singUp(@Body() dto: RegisterDto) {
    const user = await this.authService.singUp(dto);
    if (!user) {
      throw new BadRequestException(
        `Не получается зарегистрировать пользователя с данными ${JSON.stringify(dto)}`,
      );
    }
    return new UserResponse(user);
  }

  @Post('confirm?')
  async confirm(
    @Body() dto: ConfirmDto,
    @Res() res: Response,
    @UserAgent() agent: string,
  ) {
    const user = await this.authService.confirm(dto);
    const tokens = await this.authService.generateTokens(user, agent);
    this.setRefreshTokenToCookies(tokens, res);
  }

  @Post('request-recovery')
  async recoverRequest(
    @Body() dto: RecoverRequestDto,
    @Res() res: Response,
    @UserAgent() agent: string,
  ) {
    await this.authService.requestRecovery(dto, agent);
    res.status(HttpStatus.OK).json({
      result: 'Recovery instructions are sent!',
    });
  }

  @Post('recover')
  async recover(
    @Body() dto: RecoverDto,
    @Res() res: Response,
    @UserAgent() agent: string,
  ) {
    const user = await this.authService.recover(dto);
    const tokens = await this.authService.generateTokens(user, agent);
    this.setRefreshTokenToCookies(tokens, res);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res() res: Response,
    @UserAgent() agent: string,
  ) {
    const tokens = await this.authService.login(dto, agent);
    if (!tokens) {
      throw new BadRequestException(
        `Не получилось войти с ${JSON.stringify(dto)}`,
      );
    }
    this.setRefreshTokenToCookies(tokens, res);
  }

  @Get('logout')
  async logout(
    @Cookie(REFRESH_TOKEN) refreshToken: string,
    @Res() res: Response,
  ) {
    if (refreshToken) {
      await this.authService.deleteRefreshToken(refreshToken);
      res.cookie(REFRESH_TOKEN, '', {
        httpOnly: true,
        secure: true,
        expires: new Date(),
      });
    }
    res.status(HttpStatus.OK).json({
      result: 'Successfully logged out',
    });
  }

  @Get('refresh-tokens') // to upsert refresh token in DB
  async refreshTokens(
    @Cookie(REFRESH_TOKEN) refreshToken: string,
    @Res() res: Response,
    @UserAgent() agent: string,
  ) {
    if (!refreshToken) {
      throw new UnauthorizedException();
    }
    const tokens = await this.authService.refreshTokens(refreshToken, agent);
    if (!tokens) {
      throw new UnauthorizedException();
    }
    this.setRefreshTokenToCookies(tokens, res);
  }

  private setRefreshTokenToCookies(tokens: Tokens, res: Response) {
    if (!tokens) {
      throw new UnauthorizedException();
    }
    res.cookie(REFRESH_TOKEN, tokens.refreshToken.token, {
      httpOnly: true, // to not allow to get it by JS on client
      sameSite: 'lax', // to protect getting a token form another web sites
      expires: new Date(tokens.refreshToken.exp),
      secure:
        this.configService.get('NODE_ENV', 'development') === 'production', // http(S)
      path: '/', // to see cookie on all pages
    });
    res.status(HttpStatus.CREATED).json({
      accessToken: tokens.accessToken,
    });
  }

  @UseGuards(GoogleGuard)
  @Get('google')
  googleAuth() {}

  @UseGuards(GoogleGuard)
  @Get('google/callback')
  googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const token = req.user['accessToken'];
    return res.redirect(
      `http://localhost:3000/api/auth/success-google?token=${token}`,
    );
  }

  @Get('success-google')
  successGoogle(
    @Query('token') token: string,
    @UserAgent() agent: string,
    @Res() res: Response,
  ) {
    return this.httpService
      .get(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`,
      )
      .pipe(
        mergeMap(({ data: { email } }) =>
          this.authService.providerAuth(email, agent, Provider.GOOGLE),
        ),
        map((data) => this.setRefreshTokenToCookies(data, res)),
        handleTimeoutAndErrors(),
      );
  }

  @UseGuards(YandexGuard)
  @Get('yandex')
  yandexAuth() {}

  @UseGuards(YandexGuard)
  @Get('yandex/callback')
  yandexAuthCallback(@Req() req: Request, @Res() res: Response) {
    const token = req.user['accessToken'];
    return res.redirect(
      `http://localhost:3000/api/auth/success-yandex?token=${token}`,
    );
  }

  @Get('success-yandex')
  successYandex(
    @Query('token') token: string,
    @UserAgent() agent: string,
    @Res() res: Response,
  ) {
    return this.httpService
      .get(`https://login.yandex.ru/info?format=json&oauth_token=${token}`)
      .pipe(
        mergeMap(({ data: { default_email } }) =>
          this.authService.providerAuth(default_email, agent, Provider.YANDEX),
        ),
        map((data) => this.setRefreshTokenToCookies(data, res)),
        handleTimeoutAndErrors(),
      );
  }
}
