import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const secret = this.config.get<string>('DOCUMENT_ENCRYPTION_KEY');
    if (!secret) {
      this.logger.warn(
        'DOCUMENT_ENCRYPTION_KEY not set, using derived fallback key. Set this in production for security.',
      );
      const fallback = this.config.get<string>('JWT_SECRET', 'dabbu-fallback-key');
      this.key = crypto.scryptSync(fallback, 'dabbu-docs-salt', 32);
    } else {
      this.key = crypto.scryptSync(secret, 'dabbu-docs-salt', 32);
    }
  }

  encrypt(buffer: Buffer): { encrypted: Buffer; iv: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return { encrypted, iv: iv.toString('hex') };
  }

  decrypt(encrypted: Buffer, ivHex: string): Buffer {
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
}
