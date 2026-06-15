import { registerAs } from '@nestjs/config';

export default registerAs('expo', () => ({
  accessToken: process.env.EXPO_ACCESS_TOKEN || '',
}));
