import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'dabbu-dev-jwt-secret-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '30m',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'dabbu-dev-refresh-secret-change-in-production',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  issuer: process.env.JWT_ISSUER || 'dabbu',
  audience: process.env.JWT_AUDIENCE || 'dabbu-users',
}));
