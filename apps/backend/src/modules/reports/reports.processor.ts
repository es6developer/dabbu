import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ReportsService } from './reports.service';
import * as fs from 'fs';
import * as path from 'path';

interface GenerateReportJob {
  userId: string;
  type: string;
  format: string;
  options?: {
    months?: number;
    year?: number;
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    groupId?: string;
  };
}

@Processor('report-queue')
export class ReportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportsProcessor.name);

  constructor(private readonly reportsService: ReportsService) {
    super();
  }

  async process(job: Job<GenerateReportJob>): Promise<void> {
    this.logger.debug(`Processing report job ${job.id}: ${job.data.type} (${job.data.format})`);

    switch (job.name) {
      case 'generate-report':
        await this.handleGenerateReport(job);
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async handleGenerateReport(job: Job<GenerateReportJob>): Promise<void> {
    const { userId, type, format, options } = job.data;

    try {
      const buffer = await this.reportsService.generateReportFile(userId, type, format, options);

      const tmpDir = path.join('/tmp', 'reports', userId);
      fs.mkdirSync(tmpDir, { recursive: true });
      const filePath = path.join(tmpDir, `${job.id}.${format}`);
      fs.writeFileSync(filePath, buffer);

      this.logger.log(`Report ${job.id} generated successfully at ${filePath}`);
    } catch (error: any) {
      this.logger.error(`Failed to generate report ${job.id}: ${error.message}`);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Report job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Report job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }
}
