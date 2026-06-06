import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  enabled: process.env.AI_ENABLED === 'true',
  provider: process.env.AI_PROVIDER || 'ollama',
  baseUrl: process.env.AI_BASE_URL || 'http://localhost:11434',
  model: process.env.AI_MODEL || 'llama3.2',
  apiKey: process.env.AI_API_KEY || '',
  timeout: parseInt(process.env.AI_TIMEOUT || '30000', 10),
  maxRetries: parseInt(process.env.AI_MAX_RETRIES || '2', 10),
}));
