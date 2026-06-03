import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as multer from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 20_000_000 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document (encrypted)' })
  async upload(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: any,
    @Body() dto: CreateDocumentDto,
  ) {
    const doc = await this.documentsService.upload(userId, file, dto);
    return { data: doc };
  }

  @Get()
  @ApiOperation({ summary: 'List all documents' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryDocumentDto,
  ) {
    const docs = await this.documentsService.findAll(userId, query);
    return { data: docs };
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get documents grouped by category with counts' })
  async getCategories(@CurrentUser('id') userId: string) {
    return this.documentsService.getCategories(userId);
  }

  @Get('expiring-soon')
  @ApiOperation({ summary: 'Get documents expiring within 30 days' })
  async getExpiringSoon(@CurrentUser('id') userId: string) {
    return { data: await this.documentsService.getExpiringSoon(userId) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document details' })
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const doc = await this.documentsService.findOne(userId, id);
    return { data: doc };
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download decrypted document' })
  async download(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { data, mimeType, name } = await this.documentsService.download(userId, id);
    const ext = mimeType.split('/')[1] || 'bin';
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${name}.${ext}"`,
      'Content-Length': data.length.toString(),
    });
    res.send(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document metadata' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    const doc = await this.documentsService.update(userId, id, dto);
    return { data: doc };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a document' })
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.documentsService.remove(userId, id);
  }
}
