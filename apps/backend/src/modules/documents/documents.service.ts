import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from './encryption.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  private readonly uploadDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {
    const defaultUploadDir =
      process.env.VERCEL === '1'
        ? path.join(os.tmpdir(), 'uploads/documents')
        : 'uploads/documents';

    this.uploadDir = path.resolve(process.env.DOCUMENT_UPLOAD_DIR || defaultUploadDir);
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async upload(
    userId: string,
    file: any,
    dto: CreateDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const buffer = file.buffer || fs.readFileSync(file.path);
    const { encrypted, iv } = this.encryption.encrypt(buffer);

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${file.originalname || 'document'}`;
    const filePath = path.join(this.uploadDir, fileName);
    fs.writeFileSync(filePath, encrypted);

    const doc = await this.prisma.userDocument.create({
      data: {
        userId,
        name: dto.name,
        category: dto.category,
        fileUrl: filePath,
        encryptedPath: filePath,
        encryptionIv: iv,
        mimeType: file.mimetype || 'application/octet-stream',
        fileSize: buffer.length,
        documentNumber: dto.documentNumber || null,
        issuedDate: dto.issuedDate ? new Date(dto.issuedDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        issuer: dto.issuer || null,
        notes: dto.notes || null,
      },
    });

    return this.sanitize(doc);
  }

  async findAll(userId: string, query?: QueryDocumentDto) {
    const where: any = { userId, deletedAt: null };
    if (query?.category) {
      where.category = query.category;
    }

    const docs = await this.prisma.userDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((d) => this.sanitize(d));
  }

  async findOne(userId: string, id: string) {
    const doc = await this.prisma.userDocument.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return this.sanitize(doc);
  }

  async update(userId: string, id: string, dto: UpdateDocumentDto) {
    const doc = await this.prisma.userDocument.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const updated = await this.prisma.userDocument.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.documentNumber !== undefined && { documentNumber: dto.documentNumber }),
        ...(dto.issuedDate !== undefined && { issuedDate: new Date(dto.issuedDate) }),
        ...(dto.expiryDate !== undefined && { expiryDate: new Date(dto.expiryDate) }),
        ...(dto.issuer !== undefined && { issuer: dto.issuer }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.isArchived !== undefined && { isArchived: dto.isArchived }),
      },
    });

    return this.sanitize(updated);
  }

  async remove(userId: string, id: string) {
    const doc = await this.prisma.userDocument.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Document not found');

    await this.prisma.userDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Document deleted' };
  }

  async download(userId: string, id: string): Promise<{ data: Buffer; mimeType: string; name: string }> {
    const doc = await this.prisma.userDocument.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const encrypted = fs.readFileSync(doc.encryptedPath);
    const decrypted = this.encryption.decrypt(encrypted, doc.encryptionIv);

    return { data: decrypted, mimeType: doc.mimeType, name: doc.name };
  }

  async getExpiringSoon(userId: string, days = 30) {
    const now = new Date();
    const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const docs = await this.prisma.userDocument.findMany({
      where: {
        userId,
        deletedAt: null,
        expiryDate: { not: null, gte: now, lte: threshold },
      },
      orderBy: { expiryDate: 'asc' },
    });

    return docs.map((d) => ({
      ...this.sanitize(d),
      daysUntilExpiry: Math.ceil(
        (d.expiryDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ),
    }));
  }

  async getCategories(userId: string) {
    const docs = await this.prisma.userDocument.findMany({
      where: { userId, deletedAt: null },
      select: { category: true, id: true, expiryDate: true, name: true },
    });

    const grouped: Record<string, { count: number; expiring: number; documents: { id: string; name: string; expiryDate: Date | null }[] }> = {};

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const doc of docs) {
      if (!grouped[doc.category]) {
        grouped[doc.category] = { count: 0, expiring: 0, documents: [] };
      }
      grouped[doc.category].count++;
      if (doc.expiryDate && doc.expiryDate <= in30Days && doc.expiryDate >= now) {
        grouped[doc.category].expiring++;
      }
      grouped[doc.category].documents.push({
        id: doc.id,
        name: doc.name,
        expiryDate: doc.expiryDate,
      });
    }

    return grouped;
  }

  private sanitize(doc: any) {
    const { encryptedPath, encryptionIv, ...rest } = doc;
    return rest;
  }
}
