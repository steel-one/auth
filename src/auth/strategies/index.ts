import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';

export const STRATEGIES = [JwtStrategy, GoogleStrategy];
export * from './jwt.strategy';
