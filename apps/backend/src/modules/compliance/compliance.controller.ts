import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { ComplianceService } from './compliance.service';

@ApiTags('Compliance')
@ApiBearerAuth()
@Controller()
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post('compliance/export')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export all user data (GDPR portability)' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'pdf'] })
  async exportData(
    @CurrentUser('id') userId: string,
    @Query('format') format?: string,
    @Body('includes') includes?: string[],
  ) {
    return this.complianceService.exportUserData(userId, (format as any) || 'json', includes);
  }

  @Get('compliance/exports')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get data export history' })
  async getExportHistory(@CurrentUser('id') userId: string) {
    return this.complianceService.getExportHistory(userId);
  }

  @Post('compliance/delete-account')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request account deletion' })
  async requestDeletion(@CurrentUser('id') userId: string) {
    return this.complianceService.requestAccountDeletion(userId);
  }

  @Post('compliance/delete-account/confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm and execute account deletion' })
  async confirmDeletion(@CurrentUser('id') userId: string, @Body('password') password?: string) {
    return this.complianceService.deleteAccount(userId, password);
  }

  @Post('compliance/delete-account/cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel account deletion request' })
  async cancelDeletion(@CurrentUser('id') userId: string) {
    return this.complianceService.cancelAccountDeletion(userId);
  }

  @Get('compliance/data-retention-policy')
  @ApiOperation({ summary: 'Get data retention policy' })
  async getDataRetentionPolicy() {
    return this.complianceService.getDataRetentionPolicy();
  }
}
