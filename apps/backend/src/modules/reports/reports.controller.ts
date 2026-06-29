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
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PremiumGuard } from '../premium/guards/premium.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ExportReportDto } from './dto/export-report.dto';

const FORMAT_MAP: Record<string, { ext: string; mime: string }> = {
  pdf: { ext: 'pdf', mime: 'application/pdf' },
  excel: { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  csv: { ext: 'csv', mime: 'text/csv' },
};

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
    summary: 'Get monthly report for the last N months (optionally scoped to a group or lens)',
  })
  @ApiQuery({ name: 'groupId', required: false })
  @ApiQuery({ name: 'lens', required: false, enum: ['PERSONAL', 'PARTNERED', 'FAMILY', 'FULL'] })
  async getMonthlyReport(
    @CurrentUser('id') userId: string,
    @Query('months') months?: string,
    @Query('groupId') groupId?: string,
    @Query('lens') lens?: string,
  ) {
    const report = await this.reportsService.getMonthlyReport(
      userId,
      months ? parseInt(months) : 6,
      groupId,
      lens,
    );
    return { data: report };
  }

  @Get('annual')
  @ApiOperation({ summary: 'Get annual report for a given year (optionally scoped to a group)' })
  @ApiQuery({ name: 'groupId', required: false })
  @ApiQuery({ name: 'lens', required: false, enum: ['PERSONAL', 'PARTNERED', 'FAMILY', 'FULL'] })
  async getAnnualReport(
    @CurrentUser('id') userId: string,
    @Query('year') year?: string,
    @Query('groupId') groupId?: string,
    @Query('lens') lens?: string,
  ) {
    const report = await this.reportsService.getAnnualReport(
      userId,
      year ? parseInt(year) : undefined,
      groupId,
      lens,
    );
    return { data: report };
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Get category-wise spending report (optionally scoped to a group or lens)',
  })
  @ApiQuery({ name: 'groupId', required: false })
  @ApiQuery({ name: 'lens', required: false, enum: ['PERSONAL', 'PARTNERED', 'FAMILY', 'FULL'] })
  async getCategoryReport(
    @CurrentUser('id') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupId') groupId?: string,
    @Query('lens') lens?: string,
  ) {
    const report = await this.reportsService.getCategoryReport(
      userId,
      startDate,
      endDate,
      groupId,
      lens,
    );
    return { data: report };
  }

  @Get('custom')
  @UseGuards(PremiumGuard)
  @ApiOperation({ summary: 'Generate a custom report with specific filters (premium)' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'groupId', required: false })
  @ApiQuery({ name: 'lens', required: false, enum: ['PERSONAL', 'PARTNERED', 'FAMILY', 'FULL'] })
  async getCustomReport(
    @CurrentUser('id') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('categoryId') categoryId?: string,
    @Query('groupId') groupId?: string,
    @Query('lens') lens?: string,
  ) {
    const report = await this.reportsService.getCustomReport(userId, {
      startDate,
      endDate,
      categoryId,
      groupId,
      lens,
    });
    return { data: report };
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export report as PDF/Excel/CSV (optionally scoped to a lens)' })
  async exportReport(
    @CurrentUser('id') userId: string,
    @Body() dto: ExportReportDto,
    @Res() res: Response,
  ) {
    if (this.reportQueue) {
      const job = await this.reportQueue.add('generate-report', {
        userId,
        type: dto.type,
        format: dto.format,
        lens: dto.lens,
        options: {
          startDate: dto.startDate,
          endDate: dto.endDate,
          categoryId: dto.categoryId,
          groupId: dto.groupId,
        },
      });
      return res.json({ message: 'Report generation queued', jobId: job.id });
    }
    const buffer = await this.reportsService.generateReportFile(userId, dto.type, dto.format, {
      startDate: dto.startDate,
      endDate: dto.endDate,
      categoryId: dto.categoryId,
      groupId: dto.groupId,
      lens: dto.lens,
    });
    const fmt = FORMAT_MAP[dto.format] || { ext: dto.format, mime: 'application/octet-stream' };
    res.setHeader('Content-Type', fmt.mime);
    res.setHeader('Content-Disposition', `attachment; filename="dabbu-report.${fmt.ext}"`);
    res.send(buffer);
  }
}
