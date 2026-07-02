import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { AiService } from './ai.service';
import { AiInsightsQueryDto } from './dto/ai-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../premium/guards/feature.guard';
import { RequiresPremium } from '../premium/guards/requires-premium.decorator';
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
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  async getInsights(@CurrentUser('id') userId: string, @Query() query: AiInsightsQueryDto) {
    const section = query.section || 'dashboard';
    const context = { userId, section, narrative: query.narrative || undefined };
    const insights = await this.aiService.generateInsights(section, context);
    return { data: insights };
  }

  @Post('narrative')
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
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
  @UseGuards(FeatureGuard)
  @RequiresPremium('ai_coach')
  async chat(@CurrentUser('id') userId: string, @Body() body: { prompt: string }) {
    const result = await this.aiService.processChat(userId, body.prompt);
    return { data: result };
  }

  @Get('groups/:groupId/insights')
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  async getGroupInsights(@CurrentUser('id') userId: string, @Param('groupId') groupId: string) {
    const narrative = await this.aiService.generateGroupNarrative(groupId, userId);
    return { data: narrative };
  }

  @Get('groups/:groupId/split-insights')
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  async getSplitInsights(@CurrentUser('id') userId: string, @Param('groupId') groupId: string) {
    const narrative = await this.aiService.generateSplitNarrative(groupId, userId);
    return { data: narrative };
  }

  // ═══════════════════════════════════════════════════════════
  // AI 2.0 — INTELLIGENCE LAYER ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  @Get('dna')
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  async getFinancialDna(@CurrentUser('id') userId: string) {
    const dna = await this.aiService.getLatestDna(userId);
    return { data: dna };
  }

  @Post('dna/compute')
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  async computeFinancialDna(@CurrentUser('id') userId: string) {
    const dna = await this.aiService.computeFinancialDna(userId);
    return { data: dna };
  }

  @Get('predictions')
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  async getPredictions(@CurrentUser('id') userId: string) {
    const predictions = await this.aiService.predictEndOfMonth(userId);
    return { data: predictions };
  }

  @Get('anomalies')
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  async getAnomalies(@CurrentUser('id') userId: string) {
    const anomalies = await this.aiService.detectAnomalies(userId);
    return { data: anomalies };
  }

  @Get('savings-opportunities')
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  async getSavingsOpportunities(@CurrentUser('id') userId: string) {
    const opportunities = await this.aiService.findSavingsOpportunities(userId);
    return { data: opportunities };
  }

  @Get('health-score')
  @UseGuards(FeatureGuard)
  @RequiresPremium('health_score')
  async getHealthScore(@CurrentUser('id') userId: string) {
    const score = await this.aiService.computeHealthScore(userId);
    return { data: score };
  }

  @Get('dashboard')
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  async getSmartDashboard(@CurrentUser('id') userId: string) {
    const dashboard = await this.aiService.generateSmartDashboard(userId);
    return { data: dashboard };
  }

  @Get('life-events')
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  async getLifeEvents(@CurrentUser('id') userId: string) {
    const events = await this.aiService.detectLifeEvents(userId);
    return { data: events };
  }

  @Get('milestones')
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  async getMilestones(@CurrentUser('id') userId: string) {
    const milestones = await this.aiService.checkMilestones(userId);
    return { data: milestones };
  }

  @Get('goals/:goalId/prediction')
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  async getGoalPrediction(@CurrentUser('id') userId: string, @Param('goalId') goalId: string) {
    const prediction = await this.aiService.predictGoalCompletion(userId, goalId);
    return { data: prediction };
  }

  @Get('goals/rebalance')
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
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
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  async optimizeSettlements(@CurrentUser('id') userId: string, @Param('groupId') groupId: string) {
    const result = await this.aiService.optimizeSettlements(groupId);
    return { data: result };
  }

  @Post('compute/all')
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  async computeAll(@CurrentUser('id') userId: string) {
    const result = await this.aiService.computeAllForUser(userId);
    return { data: result };
  }

  @Post('compute/daily')
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  async computeDaily(@CurrentUser('id') userId: string) {
    const result = await this.aiService.computeDailyForUser(userId);
    return { data: result };
  }

  @Post('compute/weekly')
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  async computeWeekly(@CurrentUser('id') userId: string) {
    const result = await this.aiService.computeWeeklyForUser(userId);
    return { data: result };
  }

  @Post('compute/monthly')
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
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
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  async analyzeReceipt(
    @CurrentUser('id') userId: string,
    @Body() body: { rawText: string; merchantHint?: string },
  ) {
    const result = await this.aiService.analyzeReceiptOcr(body.rawText, body.merchantHint);
    return { data: result };
  }

  @Get('investments/health')
  @UseGuards(FeatureGuard)
  @RequiresPremium('investment_tracker')
  async getInvestmentHealth(@CurrentUser('id') userId: string) {
    const result = await this.aiService.analyzeInvestmentHealth(userId);
    return { data: result };
  }

  @Post('retirement/project')
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
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

  @Post('family/wealth-forecast')
  @UseGuards(FeatureGuard)
  @RequiresPremium('family_wealth')
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

  @Post('tax/estimate')
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
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

  @Get('couple/intelligence')
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  @ApiOperation({ summary: 'Get couple compatibility score and intelligence (premium)' })
  @ApiQuery({ name: 'groupId', required: true })
  async getCoupleIntelligence(
    @CurrentUser('id') userId: string,
    @Query('groupId') groupId: string,
  ) {
    const result = await this.aiService.getCoupleIntelligence(userId, groupId);
    return { data: result };
  }

  @Get('family/intelligence')
  @UseGuards(FeatureGuard)
  @RequiresPremium('family_ai_advisor')
  @ApiOperation({ summary: 'Get family intelligence dashboard (premium)' })
  @ApiQuery({ name: 'familyId', required: true })
  async getFamilyIntelligence(
    @CurrentUser('id') userId: string,
    @Query('familyId') familyId: string,
  ) {
    const result = await this.aiService.getFamilyIntelligence(userId, familyId);
    return { data: result };
  }

  @Get('monthly-review')
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  async getMonthlyReview(@CurrentUser('id') userId: string) {
    const result = await this.aiService.generateMonthlyReview(userId);
    return { data: result };
  }

  @Post('export')
  @UseGuards(FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
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

  @Get('review')
  @ApiOperation({ summary: 'Get latest AI review for the user or space' })
  @ApiQuery({ name: 'spaceId', required: false })
  async getReview(@CurrentUser('id') userId: string, @Query('spaceId') spaceId?: string) {
    const review = await this.aiService.getReview(userId, spaceId);
    return { data: review };
  }

  // ═══════════════════════════════════════════════════════════
  // V3 — CONTEXTUAL AI ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  @UseGuards(JwtAuthGuard, FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  @Post('contextual/insight')
  async getContextualInsight(
    @CurrentUser('id') userId: string,
    @Body() body: { screen: string; context?: Record<string, any> },
  ) {
    const result = await this.aiService.getContextualInsight(userId, body.screen, body.context);
    return { data: result };
  }

  @UseGuards(JwtAuthGuard, FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  @Post('contextual/forecast')
  async getContextualForecast(
    @CurrentUser('id') userId: string,
    @Body() body: { goalId?: string; planId?: string; months?: number },
  ) {
    const result = await this.aiService.getContextualForecast(userId, body.goalId, body.planId, body.months);
    return { data: result };
  }

  @UseGuards(JwtAuthGuard, FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  @Post('contextual/rebalance')
  async getContextualRebalance(
    @CurrentUser('id') userId: string,
    @Body() body: { targetCategory?: string; monthlyBudget?: number },
  ) {
    const result = await this.aiService.getContextualRebalance(userId, body.targetCategory, body.monthlyBudget);
    return { data: result };
  }

  @UseGuards(JwtAuthGuard, FeatureGuard)
  @RequiresPremium('advanced_ai_insights')
  @Post('contextual/categorize')
  async getContextualCategorize(
    @CurrentUser('id') userId: string,
    @Body() body: { description: string; amount?: number },
  ) {
    const result = await this.aiService.getContextualCategorize(userId, body.description, body.amount);
    return { data: result };
  }
}
