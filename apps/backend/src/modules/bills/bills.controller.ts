import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BillsService } from './bills.service';
import { BillScannerService } from '../transactions/services/bill-scanner.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bills')
export class BillsController {
  constructor(
    private readonly billsService: BillsService,
    private readonly billScanner: BillScannerService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save a scanned bill with pre-parsed data' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() body: {
      merchantName: string;
      category: string;
      totalAmount: number;
      billDate: string;
      items: any[];
      rawText: string;
      confidence: number;
    },
  ) {
    const bill = await this.billsService.create(userId, body);
    return { data: bill };
  }

  @Post('scan')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Scan a bill from image' })
  async scan(
    @CurrentUser('id') userId: string,
    @Body() body: { image: string; mimeType: string },
  ) {
    const scanResult = await this.billScanner.scanBill(body.image, body.mimeType);
    const bill = await this.billsService.create(userId, scanResult);
    return { data: bill };
  }

  @Get()
  @ApiOperation({ summary: 'List scanned bills with optional filters' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('category') category?: string,
  ) {
    const result = await this.billsService.findAll(userId, month, year, category);
    return { data: result };
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Get bills grouped by month' })
  async findMonthly(@CurrentUser('id') userId: string) {
    const result = await this.billsService.findMonthly(userId);
    return { data: result };
  }

  @Get('comparison')
  @ApiOperation({ summary: 'Compare bills between two months' })
  async compare(
    @CurrentUser('id') userId: string,
    @Query('month1') month1: string,
    @Query('year1') year1: string,
    @Query('month2') month2: string,
    @Query('year2') year2: string,
  ) {
    const result = await this.billsService.compare(userId, month1, year1, month2, year2);
    return { data: result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single scanned bill' })
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const bill = await this.billsService.findOne(userId, id);
    return { data: bill };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a scanned bill' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { merchantName?: string; category?: string; billDate?: string; items?: any; notes?: string },
  ) {
    const bill = await this.billsService.update(userId, id, body);
    return { data: bill };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a scanned bill' })
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const result = await this.billsService.remove(userId, id);
    return { data: result };
  }
}
