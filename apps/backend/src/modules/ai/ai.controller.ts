import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { AiService } from './ai.service';
import { AiInsightsQueryDto } from './dto/ai-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PremiumGuard } from '../premium/guards/premium.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('health')
  checkHealth() {
    return { enabled: this.aiService.isEnabled() };
  }

  @Get('insights')
  async getInsights(@CurrentUser('id') userId: string, @Query() query: AiInsightsQueryDto) {
    const section = query.section || 'dashboard';
    const context = { userId, section, narrative: query.narrative || undefined };
    const insights = await this.aiService.generateInsights(section, context);
    return { data: insights };
  }

  @Post('narrative')
  async getNarrative(
    @CurrentUser('id') userId: string,
    @Body() body: { section: string; context: Record<string, any> },
  ) {
    const narrative = await this.aiService.generateNarrative(body.section || 'dashboard', {
      ...body.context,
      userId,
    });
    return { data: narrative };
  }

  @Post('chat')
  async chat(@CurrentUser('id') userId: string, @Body() body: { prompt: string }) {
    const result = await this.aiService.processChat(userId, body.prompt);
    return { data: result };
  }

  @Get('groups/:groupId/insights')
  async getGroupInsights(@CurrentUser('id') userId: string, @Param('groupId') groupId: string) {
    const narrative = await this.aiService.generateGroupNarrative(groupId, userId);
    return { data: narrative };
  }

  @Get('groups/:groupId/split-insights')
  async getSplitInsights(@CurrentUser('id') userId: string, @Param('groupId') groupId: string) {
    const narrative = await this.aiService.generateSplitNarrative(groupId, userId);
    return { data: narrative };
  }

  // ═══════════════════════════════════════════════════════════
  // AI 2.0 — INTELLIGENCE LAYER ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  @Get('dna')
  async getFinancialDna(@CurrentUser('id') userId: string) {
    const dna = await this.aiService.getLatestDna(userId);
    return { data: dna };
  }

  @Post('dna/compute')
  async computeFinancialDna(@CurrentUser('id') userId: string) {
    const dna = await this.aiService.computeFinancialDna(userId);
    return { data: dna };
  }

  @Get('predictions')
  async getPredictions(@CurrentUser('id') userId: string) {
    const predictions = await this.aiService.predictEndOfMonth(userId);
    return { data: predictions };
  }

  @Get('anomalies')
  async getAnomalies(@CurrentUser('id') userId: string) {
    const anomalies = await this.aiService.detectAnomalies(userId);
    return { data: anomalies };
  }

  @Get('savings-opportunities')
  async getSavingsOpportunities(@CurrentUser('id') userId: string) {
    const opportunities = await this.aiService.findSavingsOpportunities(userId);
    return { data: opportunities };
  }

  @Get('health-score')
  async getHealthScore(@CurrentUser('id') userId: string) {
    const score = await this.aiService.computeHealthScore(userId);
    return { data: score };
  }

  @Get('dashboard')
  async getSmartDashboard(@CurrentUser('id') userId: string) {
    const dashboard = await this.aiService.generateSmartDashboard(userId);
    return { data: dashboard };
  }

  @Get('life-events')
  async getLifeEvents(@CurrentUser('id') userId: string) {
    const events = await this.aiService.detectLifeEvents(userId);
    return { data: events };
  }

  @Get('milestones')
  async getMilestones(@CurrentUser('id') userId: string) {
    const milestones = await this.aiService.checkMilestones(userId);
    return { data: milestones };
  }

  @Get('goals/:goalId/prediction')
  async getGoalPrediction(@CurrentUser('id') userId: string, @Param('goalId') goalId: string) {
    const prediction = await this.aiService.predictGoalCompletion(userId, goalId);
    return { data: prediction };
  }

  @Get('goals/rebalance')
  async getGoalRebalancing(@CurrentUser('id') userId: string) {
    const result = await this.aiService.suggestGoalRebalancing(userId);
    return { data: result };
  }

  @Post('categories/suggest')
  async suggestCategory(@CurrentUser('id') userId: string, @Body() body: { description: string }) {
    const suggestion = await this.aiService.suggestCategory(body.description, userId);
    return { data: suggestion };
  }

  @Post('categories/correct')
  async recordCorrection(
    @CurrentUser('id') userId: string,
    @Body() body: { originalText: string; correctedCategory: string },
  ) {
    const result = await this.aiService.recordCategoryCorrection(
      body.originalText,
      body.correctedCategory,
      userId,
    );
    return { data: result };
  }

  @Get('groups/:groupId/settlements/optimize')
  async optimizeSettlements(@CurrentUser('id') userId: string, @Param('groupId') groupId: string) {
    const result = await this.aiService.optimizeSettlements(groupId);
    return { data: result };
  }

  @Post('compute/all')
  async computeAll(@CurrentUser('id') userId: string) {
    const result = await this.aiService.computeAllForUser(userId);
    return { data: result };
  }

  @Post('compute/daily')
  async computeDaily(@CurrentUser('id') userId: string) {
    const result = await this.aiService.computeDailyForUser(userId);
    return { data: result };
  }

  @Post('compute/weekly')
  async computeWeekly(@CurrentUser('id') userId: string) {
    const result = await this.aiService.computeWeeklyForUser(userId);
    return { data: result };
  }

  @Post('compute/monthly')
  async computeMonthly(@CurrentUser('id') userId: string) {
    const result = await this.aiService.computeMonthlyForUser(userId);
    return { data: result };
  }

  // ═══════════════════════════════════════════════════════════
  // SMART OCR + PREMIUM AI FEATURES
  // ═══════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════
  // PREMIUM AI FEATURES (require PremiumGuard)
  // ═══════════════════════════════════════════════════════════

  @Post('ocr/analyze')
  @UseGuards(PremiumGuard)
  async analyzeReceipt(
    @CurrentUser('id') userId: string,
    @Body() body: { rawText: string; merchantHint?: string },
  ) {
    const result = await this.aiService.analyzeReceiptOcr(body.rawText, body.merchantHint);
    return { data: result };
  }

  @UseGuards(PremiumGuard)
  @Get('investments/health')
  async getInvestmentHealth(@CurrentUser('id') userId: string) {
    const result = await this.aiService.analyzeInvestmentHealth(userId);
    return { data: result };
  }

  @UseGuards(PremiumGuard)
  @Post('retirement/project')
  async projectRetirement(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      currentAge: number;
      retirementAge: number;
      lifeExpectancy: number;
      monthlyContribution: number;
      annualReturnRate: number;
      monthlyExpensesInRetirement: number;
    },
  ) {
    const result = await this.aiService.projectRetirement(userId, body);
    return { data: result };
  }

  @UseGuards(PremiumGuard)
  @Post('family/wealth-forecast')
  async forecastWealth(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      members: { name: string; age: number; annualIncome: number }[];
      totalLiabilities: number;
      monthlySavings: number;
      annualReturnRate: number;
      children: { age: number; educationCost: number; educationYear: number }[];
      majorExpenses: { year: number; amount: number; description: string }[];
    },
  ) {
    const result = await this.aiService.forecastFamilyWealth(userId, body);
    return { data: result };
  }

  @UseGuards(PremiumGuard)
  @Post('tax/estimate')
  async calculateTax(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      annualIncome: number;
      otherIncome: number;
      regime: 'old' | 'new';
      sections?: any;
      tdsDeducted?: number;
    },
  ) {
    const result = await this.aiService.calculateTaxEstimate(userId, body);
    return { data: result };
  }

  // ═══════════════════════════════════════════════════════════
  // COUPLE & FAMILY INTELLIGENCE (premium)
  // ═══════════════════════════════════════════════════════════

  @UseGuards(PremiumGuard)
  @Get('couple/intelligence')
  @ApiOperation({ summary: 'Get couple compatibility score and intelligence (premium)' })
  @ApiQuery({ name: 'groupId', required: true })
  async getCoupleIntelligence(
    @CurrentUser('id') userId: string,
    @Query('groupId') groupId: string,
  ) {
    const result = await this.aiService.getCoupleIntelligence(userId, groupId);
    return { data: result };
  }

  @UseGuards(PremiumGuard)
  @Get('family/intelligence')
  @ApiOperation({ summary: 'Get family intelligence dashboard (premium)' })
  @ApiQuery({ name: 'familyId', required: true })
  async getFamilyIntelligence(
    @CurrentUser('id') userId: string,
    @Query('familyId') familyId: string,
  ) {
    const result = await this.aiService.getFamilyIntelligence(userId, familyId);
    return { data: result };
  }

  @UseGuards(PremiumGuard)
  @UseGuards(PremiumGuard)
  @Get('monthly-review')
  async getMonthlyReview(@CurrentUser('id') userId: string) {
    const result = await this.aiService.generateMonthlyReview(userId);
    return { data: result };
  }

  @UseGuards(PremiumGuard)
  @Post('export')
  @ApiOperation({ summary: 'Export AI monthly review as PDF' })
  async exportPdf(@CurrentUser('id') userId: string, @Res() res: Response) {
    const review = await this.aiService.generateMonthlyReview(userId);
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="dabbu-ai-review.pdf"`);
      res.send(buffer);
    });

    const primary = '#6366F1';
    const textGray = '#374151';
    const lightGray = '#9CA3AF';

    doc.fontSize(24).font('Helvetica-Bold').fillColor(primary).text('Dabbu AI Review', { align: 'center' });
    doc.fontSize(12).font('Helvetica').fillColor(lightGray).text(review?.period || '', { align: 'center' });
    doc.moveDown(1.5);

    const r = review as any;
    // Health Score
    if (r?.healthScore) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor(primary).text('Financial Health Score');
      doc.fontSize(28).font('Helvetica-Bold').fillColor(textGray).text(`${r.healthScore.current ?? 0}/100`, { align: 'center' });
      doc.moveDown(0.5);
      if (r.healthScore.change != null) {
        doc.fontSize(10).font('Helvetica').fillColor(lightGray).text(`Change: ${r.healthScore.change > 0 ? '+' : ''}${r.healthScore.change}`, { align: 'center' });
      }
      doc.moveDown(1);
    }

    // Summary
    if (r?.summary) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor(primary).text('Summary');
      doc.fontSize(10).font('Helvetica').fillColor(textGray).text(r.summary, { align: 'left' });
      doc.moveDown(1);
    }

    // Income / Expenses / Savings
    const lineY = (label: string, amount: number, color: string) => {
      doc.fontSize(11).font('Helvetica-Bold').fillColor(color).text(`${label}`, { continued: true });
      doc.fontSize(11).font('Helvetica').fillColor(textGray).text(`  ₹${(amount || 0).toLocaleString('en-IN')}`);
    };

    doc.fontSize(14).font('Helvetica-Bold').fillColor(primary).text('Monthly Overview');
    doc.moveDown(0.3);
    lineY('Income', r?.income?.total ?? 0, '#16A34A');
    lineY('Expenses', r?.expenses?.total ?? 0, '#DC2626');
    lineY('Savings', r?.savings?.total ?? 0, '#6366F1');
    if (r?.savings?.rate != null) {
      doc.fontSize(10).font('Helvetica').fillColor(lightGray).text(`Savings Rate: ${r.savings.rate}%`);
    }
    doc.moveDown(1);

    // Top Categories
    if (r?.expenses?.byCategory?.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor(primary).text('Top Spending Categories');
      doc.moveDown(0.3);
      r.expenses.byCategory.slice(0, 5).forEach((c: any) => {
        doc.fontSize(10).font('Helvetica').fillColor(textGray).text(`${c.category}: ₹${(c.amount || 0).toLocaleString('en-IN')} (${c.percentage ?? 0}%)`);
      });
      doc.moveDown(1);
    }

    // Next Month Focus
    if (r?.nextMonthFocus) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor(primary).text('Next Month Focus');
      doc.fontSize(10).font('Helvetica').fillColor(textGray).text(r.nextMonthFocus);
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica').fillColor(lightGray).text('Generated by Dabbu — Smart Family Finance', { align: 'center' });

    doc.end();
  }

  // ═══════════════════════════════════════════════════════════
  // TODAY FEED ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  @Get('today-feed')
  async getTodayFeed(@CurrentUser('id') userId: string) {
    return this.aiService.getTodayFeed(userId);
  }

  @Post('recompute-feed')
  async recomputeFeed(@CurrentUser('id') userId: string) {
    return this.aiService.generateTodayFeed(userId);
  }

  @Get('feed-summary')
  async getFeedSummary(@CurrentUser('id') userId: string) {
    return this.aiService.getFeedSummary(userId);
  }

  @Patch('feed/:cardId/read')
  async markFeedCardRead(@CurrentUser('id') userId: string, @Param('cardId') cardId: string) {
    return this.aiService.markFeedCardRead(cardId, userId);
  }

  @Patch('feed/:cardId/dismiss')
  async dismissFeedCard(@CurrentUser('id') userId: string, @Param('cardId') cardId: string) {
    return this.aiService.markFeedCardDismissed(cardId, userId);
  }
}
