import {
  Controller, Post, Delete, Param, UseGuards, UseInterceptors,
  UploadedFile, BadRequestException, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
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
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file to cloud storage' })
  async upload(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File required');
    return this.storageService.upload(file, `users/${userId}`, {
      optimize: true,
      generateThumbnail: file.mimetype.startsWith('image/'),
    });
  }

  @Post('upload/receipt')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a receipt' })
  async uploadReceipt(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File required');
    return this.storageService.upload(file, `users/${userId}/receipts`, {
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      optimize: true,
      generateThumbnail: true,
    });
  }

  @Post('upload/avatar')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload profile avatar' })
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
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
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document to vault' })
  async uploadDocument(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File required');
    return this.storageService.upload(file, `users/${userId}/documents`, {
      optimize: file.mimetype.startsWith('image/'),
      generateThumbnail: file.mimetype.startsWith('image/'),
    });
  }

  @Delete(':path')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a file from storage' })
  async delete(@Param('path') path: string) {
    await this.storageService.delete(decodeURIComponent(path));
    return { message: 'File deleted' };
  }
}
