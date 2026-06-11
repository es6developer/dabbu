import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PremiumGuard } from '../premium/guards/premium.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ExportReportDto } from './dto/export-report.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    @Optional() @InjectQueue('report-queue') private readonly reportQueue: Queue | null,
  ) {}

  @Get('monthly')
  @ApiOperation({
    summary: 'Get monthly report for the last N months (optionally scoped to a group)',
  })
  @ApiQuery({ name: 'groupId', required: false })
  async getMonthlyReport(
    @CurrentUser('id') userId: string,
    @Query('months') months?: string,
    @Query('groupId') groupId?: string,
  ) {
    const report = await this.reportsService.getMonthlyReport(
      userId,
      months ? parseInt(months) : 6,
      groupId,
    );
    return { data: report };
  }

  @Get('annual')
  @ApiOperation({ summary: 'Get annual report for a given year (optionally scoped to a group)' })
  @ApiQuery({ name: 'groupId', required: false })
  async getAnnualReport(
    @CurrentUser('id') userId: string,
    @Query('year') year?: string,
    @Query('groupId') groupId?: string,
  ) {
    const report = await this.reportsService.getAnnualReport(
      userId,
      year ? parseInt(year) : undefined,
      groupId,
    );
    return { data: report };
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get category-wise spending report (optionally scoped to a group)' })
  @ApiQuery({ name: 'groupId', required: false })
  async getCategoryReport(
    @CurrentUser('id') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupId') groupId?: string,
  ) {
    const report = await this.reportsService.getCategoryReport(userId, startDate, endDate, groupId);
    return { data: report };
  }

  @Get('custom')
  @UseGuards(PremiumGuard)
  @ApiOperation({ summary: 'Generate a custom report with specific filters (premium)' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'groupId', required: false })
  async getCustomReport(
    @CurrentUser('id') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('categoryId') categoryId?: string,
    @Query('groupId') groupId?: string,
  ) {
    const report = await this.reportsService.getCustomReport(userId, {
      startDate,
      endDate,
      categoryId,
      groupId,
    });
    return { data: report };
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export report as PDF/Excel/CSV' })
  async exportReport(@CurrentUser('id') userId: string, @Body() dto: ExportReportDto) {
    if (this.reportQueue) {
      const job = await this.reportQueue.add('generate-report', {
        userId,
        type: dto.type,
        format: dto.format,
        options: {
          startDate: dto.startDate,
          endDate: dto.endDate,
          categoryId: dto.categoryId,
          groupId: dto.groupId,
        },
      });
      return { message: 'Report generation queued', jobId: job.id };
    }
    const buffer = await this.reportsService.generateReportFile(userId, dto.type, dto.format, {
      startDate: dto.startDate,
      endDate: dto.endDate,
      categoryId: dto.categoryId,
      groupId: dto.groupId,
    });
    return { message: 'Report generated', size: buffer.length };
  }
}
