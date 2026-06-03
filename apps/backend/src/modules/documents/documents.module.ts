import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { EncryptionService } from './encryption.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, EncryptionService],
  exports: [DocumentsService, EncryptionService],
})
export class DocumentsModule {}
