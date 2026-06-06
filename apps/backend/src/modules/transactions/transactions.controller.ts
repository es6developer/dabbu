import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import * as multer from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { BillScannerService } from './services/bill-scanner.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateTransactionDto, UpdateTransactionDto, TransactionFilterDto } from './dto';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly billScanner: BillScannerService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new transaction (income/expense)' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateTransactionDto) {
    const tx = await this.transactionsService.create(userId, dto);
    return { data: tx };
  }

  @Get()
  @ApiOperation({ summary: 'List transactions with filters, search, pagination' })
  async findAll(@CurrentUser('id') userId: string, @Query() filter: TransactionFilterDto) {
    return this.transactionsService.findAll(userId, filter);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get expense analytics stats' })
  async getStats(@CurrentUser('id') userId: string, @Query('months') months?: number) {
    return this.transactionsService.getStats(userId, months || 12);
  }

  @Get('categories-summary')
  @ApiOperation({ summary: 'Get spending by category' })
  async getCategorySummary(
    @CurrentUser('id') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.transactionsService.getCategorySummary(userId, startDate, endDate);
  }

  @Get('monthly-summary')
  @ApiOperation({ summary: 'Get monthly income vs expense summary' })
  async getMonthlySummary(@CurrentUser('id') userId: string, @Query('months') months?: number) {
    return this.transactionsService.getMonthlySummary(userId, months || 12);
  }

  @Get('recurring')
  @ApiOperation({ summary: 'Get recurring transactions detected' })
  async getRecurring(@CurrentUser('id') userId: string) {
    return this.transactionsService.getRecurring(userId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search transactions by keyword' })
  async search(
    @CurrentUser('id') userId: string,
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    return this.transactionsService.search(userId, query, limit || 20);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.transactionsService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update transaction' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete transaction' })
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.transactionsService.remove(userId, id);
    return { message: 'Transaction deleted' };
  }

  @Post(':id/receipt')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload receipt image for transaction' })
  async uploadReceipt(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    return this.transactionsService.uploadReceipt(userId, id, file);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create transactions in bulk (SMS sync)' })
  async bulkCreate(@CurrentUser('id') userId: string, @Body() dtos: CreateTransactionDto[]) {
    return this.transactionsService.bulkCreate(userId, dtos);
  }

  @Post('scan-bill')
  @UseInterceptors(
    FileInterceptor('file', { storage: multer.memoryStorage(), limits: { fileSize: 10_000_000 } }),
  )
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Scan a bill/receipt image and extract transaction data using AI' })
  async scanBill(@Body() body: { image?: string; mimeType?: string }, @UploadedFile() file?: any) {
    try {
      // Support both JSON base64 uploads (legacy) and multipart file uploads
      if (file) {
        let base64: string | null = null;
        if (file.buffer) {
          base64 = file.buffer.toString('base64');
        } else if (file.path) {
          const fs = await import('fs');
          const b = await fs.promises.readFile(file.path);
          base64 = b.toString('base64');
        }
        if (!base64) {
          throw new BadRequestException('Failed to read uploaded file');
        }
        const mime = file.mimetype || body.mimeType || 'image/jpeg';
        const result = await this.billScanner.scanBill(base64, mime);
        return { data: result };
      }

      if (!body || !body.image) {
        throw new BadRequestException('No image provided');
      }

      const result = await this.billScanner.scanBill(body.image, body.mimeType);
      return { data: result };
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw new BadRequestException(err.message || 'Failed to scan bill');
    }
  }

  @Get('ocr-health')
  @ApiOperation({ summary: 'Check OCR service health' })
  async ocrHealth() {
    return this.billScanner.checkHealth();
  }
}
