import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import sharp from 'sharp';

type StorageProvider = 'local' | 's3' | 'r2' | 'supabase';

interface UploadResult {
  url: string;
  path: string;
  size: number;
  mimeType: string;
  optimizedUrl?: string;
  thumbnailUrl?: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly provider: StorageProvider;
  private readonly cdnUrl: string;
  private readonly basePath: string;

  constructor(private readonly prisma: PrismaService) {
    this.provider = (process.env.STORAGE_PROVIDER as StorageProvider) || 'local';
    this.cdnUrl = process.env.CDN_URL || '';
    this.basePath = process.env.STORAGE_BASE_PATH || 'uploads';
  }

  async upload(
    file: any,
    folder: string,
    options?: {
      optimize?: boolean;
      generateThumbnail?: boolean;
      allowedMimeTypes?: string[];
      maxSize?: number;
    },
  ): Promise<UploadResult> {
    const allowedMimeTypes = options?.allowedMimeTypes || [
      'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
      'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} not allowed`);
    }

    const maxSize = options?.maxSize || 20 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
    }

    const ext = file.originalname.split('.').pop() || 'bin';
    const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = `${this.basePath}/${folder}/${filename}`;

    let optimizedBuffer: Buffer | null = null;
    let thumbnailBuffer: Buffer | null = null;
    let optimizedUrl: string | undefined;
    let thumbnailUrl: string | undefined;

    if (options?.optimize !== false && file.mimetype.startsWith('image/')) {
      try {
        optimizedBuffer = await sharp(file.buffer)
          .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80, progressive: true })
          .toBuffer();

        if (options?.generateThumbnail !== false) {
          thumbnailBuffer = await sharp(file.buffer)
            .resize(300, 300, { fit: 'cover' })
            .jpeg({ quality: 60 })
            .toBuffer();
        }
      } catch (err: any) {
        this.logger.warn(`Image optimization failed: ${err.message}`);
      }
    }

    const buffer = optimizedBuffer || file.buffer;
    const thumbExt = 'jpg';
    const thumbFilename = `thumb_${filename.replace(/\.[^.]+$/, '')}.${thumbExt}`;
    const thumbPath = `${this.basePath}/${folder}/${thumbFilename}`;

    let url: string;
    let path: string;

    switch (this.provider) {
      case 's3':
      case 'r2':
        url = await this._uploadToS3(buffer, filePath, file.mimetype);
        if (thumbnailBuffer) {
          thumbnailUrl = await this._uploadToS3(thumbnailBuffer, thumbPath, 'image/jpeg');
        }
        path = filePath;
        if (this.cdnUrl) {
          url = `${this.cdnUrl}/${filePath}`;
          optimizedUrl = `${this.cdnUrl}/${filePath}`;
          if (thumbnailUrl) thumbnailUrl = `${this.cdnUrl}/${thumbPath}`;
        }
        break;
      case 'supabase':
        url = await this._uploadToSupabase(buffer, filePath, file.mimetype);
        if (thumbnailBuffer) {
          thumbnailUrl = await this._uploadToSupabase(thumbnailBuffer, thumbPath, 'image/jpeg');
        }
        path = filePath;
        break;
      case 'local':
      default:
        const fs = require('fs');
        const pathModule = require('path');
        const fullPath = pathModule.join(process.cwd(), filePath);
        const dir = pathModule.dirname(fullPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullPath, buffer);
        url = `/${filePath}`;
        path = fullPath;

        if (thumbnailBuffer) {
          const thumbPath = pathModule.join(process.cwd(), `${this.basePath}/${folder}/thumb_${filename}`);
          fs.writeFileSync(thumbPath, thumbnailBuffer);
          thumbnailUrl = `/${this.basePath}/${folder}/thumb_${filename}`;
        }
        break;
    }

    return {
      url,
      path,
      size: buffer.length,
      mimeType: file.mimetype,
      optimizedUrl,
      thumbnailUrl,
    };
  }

  async delete(path: string): Promise<void> {
    switch (this.provider) {
      case 's3':
      case 'r2':
        await this._deleteFromS3(path);
        break;
      case 'supabase':
        await this._deleteFromSupabase(path);
        break;
      default:
        const fs = require('fs');
        try { fs.unlinkSync(path); } catch {}
        break;
    }
  }

  private async _uploadToS3(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const client = new S3Client({
      region: process.env.AWS_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || '',
      },
      forcePathStyle: this.provider === 'r2',
    });

    const bucket = process.env.S3_BUCKET || 'dabbu-uploads';
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    return `https://${bucket}.s3.amazonaws.com/${key}`;
  }

  private async _deleteFromS3(key: string): Promise<void> {
    const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const client = new S3Client({
      region: process.env.AWS_REGION || 'auto',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    await client.send(new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET || 'dabbu-uploads',
      Key: key,
    }));
  }

  private async _uploadToSupabase(buffer: Buffer, path: string, mimeType: string): Promise<string> {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'dabbu-uploads';
    const { data, error } = await supabase.storage.from(bucket).upload(path, buffer, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: true,
    });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return urlData.publicUrl;
  }

  private async _deleteFromSupabase(path: string): Promise<void> {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );
    await supabase.storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'dabbu-uploads').remove([path]);
  }

  async getStorageUsage(userId: string): Promise<{ used: number; limit: number; files: number }> {
    const userDocuments = await this.prisma.userDocument.aggregate({
      where: { userId, deletedAt: null },
      _sum: { fileSize: true },
      _count: true,
    });

    return {
      used: Number(userDocuments._sum?.fileSize || 0),
      limit: 500 * 1024 * 1024,
      files: userDocuments._count || 0,
    };
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string | null> {
    if (this.provider !== 's3' && this.provider !== 'r2') return null;

    const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

    const client = new S3Client({
      region: process.env.AWS_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || '',
      },
      forcePathStyle: this.provider === 'r2',
    });

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET || 'dabbu-uploads',
      Key: key,
    });

    return getSignedUrl(client, command, { expiresIn });
  }

  getProvider(): StorageProvider { return this.provider; }
  getCdnUrl(): string { return this.cdnUrl; }
}
