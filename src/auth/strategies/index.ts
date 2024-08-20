import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';
import { YandexStrategy } from './yandex.strategy';

export const STRATEGIES = [JwtStrategy, GoogleStrategy, YandexStrategy];
export * from './jwt.strategy';
