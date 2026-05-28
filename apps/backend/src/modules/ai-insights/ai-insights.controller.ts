import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiInsightsService } from './ai-insights.service';

@Controller('ai-insights')
@UseGuards(JwtAuthGuard)
export class AiInsightsController {
  constructor(private readonly aiInsightsService: AiInsightsService) {}

  // ─── 1. GROUP PERSONALITY ────────────────────────────────
  @Get('groups/:groupId/personality')
  async getGroupPersonality(@Param('groupId') groupId: string) {
    return this.aiInsightsService.getGroupPersonality(groupId);
  }

  // ─── 2. COUPLE FINANCIAL HEALTH ──────────────────────────
  @Get('groups/:groupId/couple-health')
  async getCoupleHealth(@Param('groupId') groupId: string) {
    return this.aiInsightsService.getCoupleHealth(groupId);
  }

  // ─── 3. SMART SETTLEMENT REMINDERS ───────────────────────
  @Get('settlement-reminders')
  async getSettlementReminders(@CurrentUser('id') userId: string) {
    return this.aiInsightsService.getSettlementReminders(userId);
  }

  // ─── 4. TRIP STORY ───────────────────────────────────────
  @Get('trips/:tripId/story')
  async getTripStory(@Param('tripId') tripId: string) {
    return this.aiInsightsService.getTripStory(tripId);
  }

  // ─── 5. SUBSCRIPTION ANALYTICS ──────────────────────────
  @Get('groups/:groupId/subscription-analytics')
  async getSubscriptionAnalytics(@Param('groupId') groupId: string) {
    return this.aiInsightsService.getSubscriptionAnalytics(groupId);
  }

  // ─── 6. SMART ADD TO GROUP ──────────────────────────────
  @Get('match-group')
  async findMatchingGroups(
    @Query('description') description: string,
    @Query('amount') amount: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.aiInsightsService.findMatchingGroups(description, parseFloat(amount), userId);
  }

  // ─── 7. LIFE EVENT ANALYTICS ────────────────────────────
  @Get('life-events/:eventId')
  async getLifeEventAnalytics(@Param('eventId') eventId: string) {
    return this.aiInsightsService.getLifeEventAnalytics(eventId);
  }

  // ─── 8. TRUST SCORES ─────────────────────────────────────
  @Get('groups/:groupId/trust-scores')
  async getTrustScores(@Param('groupId') groupId: string) {
    return this.aiInsightsService.getTrustScores(groupId);
  }

  // ─── 9. MONTHLY REPORT ──────────────────────────────────
  @Get('reports/monthly')
  async generateMonthlyReport(
    @CurrentUser('id') userId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.aiInsightsService.generateMonthlyReport(userId, parseInt(month), parseInt(year));
  }

  // ─── 10. FINANCIAL STRESS DETECTION ─────────────────────
  @Get('stress-detection')
  async detectFinancialStress(@CurrentUser('id') userId: string) {
    return this.aiInsightsService.detectFinancialStress(userId);
  }

  // ─── 11. GROUP POLLS ────────────────────────────────────
  @Post('groups/:groupId/polls')
  async createPoll(
    @Param('groupId') groupId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { question: string; options: string[]; expiresInHours?: number },
  ) {
    return this.aiInsightsService.createPoll(groupId, userId, body.question, body.options, body.expiresInHours);
  }

  @Post('polls/:pollId/vote')
  async votePoll(
    @Param('pollId') pollId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { optionId: string },
  ) {
    return this.aiInsightsService.votePoll(pollId, body.optionId, userId);
  }

  @Get('polls/:pollId/results')
  async getPollResults(@Param('pollId') pollId: string) {
    return this.aiInsightsService.getPollResults(pollId);
  }

  // ─── 12. SHARED GROCERY ─────────────────────────────────
  @Post('groups/:groupId/grocery-lists')
  async createGroceryList(
    @Param('groupId') groupId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { name: string },
  ) {
    return this.aiInsightsService.createGroceryList(groupId, body.name, userId);
  }

  @Post('grocery-lists/:listId/items')
  async addGroceryItem(
    @Param('listId') listId: string,
    @Body() body: { name: string; quantity?: number; unit?: string; estimatedPrice?: number; category?: string; assignedTo?: string },
  ) {
    return this.aiInsightsService.addGroceryItem(listId, body.name, body.quantity || 1, body.unit || 'pcs', body.estimatedPrice, body.category, body.assignedTo);
  }

  @Get('groups/:groupId/grocery-analytics')
  async getGroceryAnalytics(@Param('groupId') groupId: string) {
    return this.aiInsightsService.getGroceryAnalytics(groupId);
  }

  // ─── 13. QR SPLIT ───────────────────────────────────────
  @Post('qr-split/sessions')
  async createQRSplitSession(
    @CurrentUser('id') userId: string,
    @Body() body: { tableName: string; groupId?: string; expiresInMinutes?: number },
  ) {
    return this.aiInsightsService.createQRSplitSession(body.tableName, userId, body.groupId, body.expiresInMinutes);
  }

  @Post('qr-split/sessions/:sessionId/join')
  async joinQRSplit(
    @Param('sessionId') sessionId: string,
    @Body() body: { name: string },
  ) {
    return this.aiInsightsService.joinQRSplit(sessionId, body.name);
  }

  @Post('qr-split/sessions/:sessionId/items')
  async addQRSplitItem(
    @Param('sessionId') sessionId: string,
    @Body() body: { name: string; price: number; quantity?: number; assignedTo?: string },
  ) {
    return this.aiInsightsService.addQRSplitItem(sessionId, body.name, body.price, body.quantity, body.assignedTo);
  }

  @Post('qr-split/sessions/:sessionId/settle')
  @HttpCode(200)
  async settleQRSplit(@Param('sessionId') sessionId: string) {
    return this.aiInsightsService.settleQRSplit(sessionId);
  }

  // ─── 14. DABBU WRAPPED ──────────────────────────────────
  @Get('wrapped/:year')
  async getYearlyWrapped(@CurrentUser('id') userId: string, @Param('year') year: string) {
    return this.aiInsightsService.getYearlyWrapped(userId, parseInt(year));
  }

  // ─── 15. FUNNY INSIGHTS ─────────────────────────────────
  @Get('groups/:groupId/funny-insights')
  async getFunnyInsights(@Param('groupId') groupId: string) {
    return this.aiInsightsService.getFunnyInsights(groupId);
  }

  // ─── 16. MEMORIES ───────────────────────────────────────
  @Get('memories')
  async generateMemories(@CurrentUser('id') userId: string) {
    return this.aiInsightsService.generateMemories(userId);
  }

  // ─── 17. FINANCIAL HEALTH ──────────────────────────────
  @Get('financial-health')
  async getFinancialHealth(@CurrentUser('id') userId: string) {
    return this.aiInsightsService.getFinancialHealth(userId);
  }

  // ─── 18. SAVINGS CHALLENGES ─────────────────────────────
  @Get('challenges')
  async getAvailableChallenges() {
    return this.aiInsightsService.getAvailableChallenges();
  }

  @Post('challenges/:challengeId/join')
  async joinChallenge(
    @Param('challengeId') challengeId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.aiInsightsService.joinChallenge(challengeId, userId);
  }

  @Post('challenges/:challengeId/complete-day')
  async completeChallengeDay(
    @Param('challengeId') challengeId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { savingsAmount?: number },
  ) {
    return this.aiInsightsService.completeChallengeDay(challengeId, userId, body.savingsAmount);
  }

  @Get('challenges/:challengeId/leaderboard')
  async getChallengeLeaderboard(@Param('challengeId') challengeId: string) {
    return this.aiInsightsService.getChallengeLeaderboard(challengeId);
  }
}
