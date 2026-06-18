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

  @Get('compliance/privacy-policy')
  @ApiOperation({ summary: 'Get the privacy policy text' })
  async getPrivacyPolicy() {
    return this.complianceService.getPrivacyPolicy();
  }

  @Get('compliance/terms-of-service')
  @ApiOperation({ summary: 'Get the terms of service text' })
  async getTermsOfService() {
    return this.complianceService.getTermsOfService();
  }

  @Get('compliance/data-retention')
  @ApiOperation({ summary: 'Get data retention policy' })
  async getDataRetention() {
    return this.complianceService.getDataRetentionPolicy();
  }

  @Get('compliance/cookie-consent')
  @ApiOperation({ summary: 'Get cookie consent settings for the user' })
  @UseGuards(JwtAuthGuard)
  async getCookieConsent(@CurrentUser('id') userId: string) {
    return this.complianceService.getCookieConsent(userId);
  }

  @Post('compliance/cookie-consent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept or reject cookies' })
  @UseGuards(JwtAuthGuard)
  async setCookieConsent(
    @CurrentUser('id') userId: string,
    @Body() body: { consent: 'accepted' | 'rejected'; categories?: string[] },
  ) {
    return this.complianceService.setCookieConsent(userId, body.consent, body.categories);
  }

  @Get('compliance/gdpr-data')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Download all user data (GDPR Article 20 - data portability)' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'pdf'] })
  async gdprDataExport(
    @CurrentUser('id') userId: string,
    @Query('format') format?: string,
  ) {
    return this.complianceService.exportUserData(userId, (format as any) || 'json');
  }

  @Delete('compliance/account')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Full account deletion (GDPR Article 17 - right to erasure)' })
  async deleteAccount(@CurrentUser('id') userId: string, @Body('password') password?: string) {
    return this.complianceService.deleteAccount(userId, password);
  }

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

  @Post('compliance/restore')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore data from a previous export' })
  async restoreData(
    @CurrentUser('id') userId: string,
    @Body() body: { data: any },
  ) {
    const result = await this.complianceService.restoreFromExport(userId, body.data);
    return { data: result };
  }

  @Get('compliance/data-retention-policy')
  @ApiOperation({ summary: 'Get data retention policy (public)' })
  async getDataRetentionPolicy() {
    return this.complianceService.getDataRetentionPolicy();
  }

  // --- CCPA-specific endpoints ---

  @Get('compliance/ccpa-right-to-know')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'CCPA Right to Know - export all collected data' })
  async ccpaRightToKnow(@CurrentUser('id') userId: string) {
    return this.complianceService.exportUserData(userId, 'json');
  }

  @Post('compliance/ccpa-opt-out')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'CCPA Right to Opt-Out of sale of personal info' })
  async ccpaOptOut(@CurrentUser('id') userId: string) {
    await this.complianceService.setCookieConsent(userId, 'rejected', []);
    return { data: { message: 'You have opted out of data sale. No data is sold.' } };
  }

  // --- Indian Compliance ---

  @Get('compliance/grievance-officer')
  @ApiOperation({ summary: 'Get grievance officer contact details (India IT Act)' })
  async getGrievanceOfficer() {
    return this.complianceService.getGrievanceOfficer();
  }

  @Get('compliance/data-localization')
  @ApiOperation({ summary: 'Get data localization details (India DPDP Act)' })
  async getDataLocalization() {
    return this.complianceService.getDataLocalization();
  }
}
