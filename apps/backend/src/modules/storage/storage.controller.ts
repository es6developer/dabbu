import {
  Controller, Get, Post, Delete, Param, Query, Req, UseGuards, UseInterceptors,
  UploadedFile, BadRequestException, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { StorageService } from './storage.service';
import { memoryStorage } from 'multer';

@ApiTags('Storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file to cloud storage' })
  async upload(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('File required');
    return this.storageService.upload(file, `users/${userId}`, {
      optimize: true,
      generateThumbnail: file.mimetype.startsWith('image/'),
    });
  }

  @Post('upload/receipt')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a receipt' })
  async uploadReceipt(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('File required');
    return this.storageService.upload(file, `users/${userId}/receipts`, {
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      optimize: true,
      generateThumbnail: true,
    });
  }

  @Post('upload/avatar')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload profile avatar' })
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('File required');
    const result = await this.storageService.upload(file, `users/${userId}/avatar`, {
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      optimize: true,
      generateThumbnail: true,
    });
    return { url: result.url, thumbnailUrl: result.thumbnailUrl };
  }

  @Post('upload/document')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document to vault' })
  async uploadDocument(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('File required');
    return this.storageService.upload(file, `users/${userId}/documents`, {
      optimize: file.mimetype.startsWith('image/'),
      generateThumbnail: file.mimetype.startsWith('image/'),
    });
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get storage usage for the current user' })
  async getUsage(@CurrentUser('id') userId: string) {
    return this.storageService.getStorageUsage(userId);
  }

  @Get('presigned-url')
  @ApiOperation({ summary: 'Generate a presigned URL for S3/R2 file access' })
  @ApiQuery({ name: 'key', required: true })
  @ApiQuery({ name: 'expiresIn', required: false })
  async getPresignedUrl(
    @Query('key') key: string,
    @Query('expiresIn') expiresIn?: string,
  ) {
    const url = await this.storageService.getPresignedUrl(key, expiresIn ? parseInt(expiresIn) : undefined);
    return { data: { url } };
  }

  @Delete(':path')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a file from storage' })
  async delete(@Param('path') path: string) {
    await this.storageService.delete(decodeURIComponent(path));
    return { message: 'File deleted' };
  }
}
