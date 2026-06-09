import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiInsightsQueryDto } from './dto/ai-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
  async getGoalPrediction(
    @CurrentUser('id') userId: string,
    @Param('goalId') goalId: string,
  ) {
    const prediction = await this.aiService.predictGoalCompletion(userId, goalId);
    return { data: prediction };
  }

  @Post('categories/suggest')
  async suggestCategory(
    @CurrentUser('id') userId: string,
    @Body() body: { description: string },
  ) {
    const suggestion = await this.aiService.suggestCategory(body.description, userId);
    return { data: suggestion };
  }

  @Post('categories/correct')
  async recordCorrection(
    @CurrentUser('id') userId: string,
    @Body() body: { originalText: string; correctedCategory: string },
  ) {
    const result = await this.aiService.recordCategoryCorrection(
      body.originalText, body.correctedCategory, userId,
    );
    return { data: result };
  }

  @Get('groups/:groupId/settlements/optimize')
  async optimizeSettlements(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
  ) {
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

  @Post('ocr/analyze')
  async analyzeReceipt(
    @CurrentUser('id') userId: string,
    @Body() body: { rawText: string; merchantHint?: string },
  ) {
    const result = await this.aiService.analyzeReceiptOcr(body.rawText, body.merchantHint);
    return { data: result };
  }

  @Get('investments/health')
  async getInvestmentHealth(@CurrentUser('id') userId: string) {
    const result = await this.aiService.analyzeInvestmentHealth(userId);
    return { data: result };
  }

  @Post('retirement/project')
  async projectRetirement(
    @CurrentUser('id') userId: string,
    @Body() body: {
      currentAge: number; retirementAge: number; lifeExpectancy: number;
      monthlyContribution: number; annualReturnRate: number;
      monthlyExpensesInRetirement: number;
    },
  ) {
    const result = await this.aiService.projectRetirement(userId, body);
    return { data: result };
  }

  @Post('family/wealth-forecast')
  async forecastWealth(
    @CurrentUser('id') userId: string,
    @Body() body: {
      members: { name: string; age: number; annualIncome: number }[];
      totalLiabilities: number; monthlySavings: number; annualReturnRate: number;
      children: { age: number; educationCost: number; educationYear: number }[];
      majorExpenses: { year: number; amount: number; description: string }[];
    },
  ) {
    const result = await this.aiService.forecastFamilyWealth(userId, body);
    return { data: result };
  }

  @Post('tax/estimate')
  async calculateTax(
    @CurrentUser('id') userId: string,
    @Body() body: {
      annualIncome: number; otherIncome: number; regime: 'old' | 'new';
      sections?: any; tdsDeducted?: number;
    },
  ) {
    const result = await this.aiService.calculateTaxEstimate(userId, body);
    return { data: result };
  }

  @Get('monthly-review')
  async getMonthlyReview(@CurrentUser('id') userId: string) {
    const result = await this.aiService.generateMonthlyReview(userId);
    return { data: result };
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
  async markFeedCardRead(
    @CurrentUser('id') userId: string,
    @Param('cardId') cardId: string,
  ) {
    return this.aiService.markFeedCardRead(cardId, userId);
  }

  @Patch('feed/:cardId/dismiss')
  async dismissFeedCard(
    @CurrentUser('id') userId: string,
    @Param('cardId') cardId: string,
  ) {
    return this.aiService.markFeedCardDismissed(cardId, userId);
  }
}
