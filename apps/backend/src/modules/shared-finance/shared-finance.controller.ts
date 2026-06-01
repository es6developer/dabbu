import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GroupMemberGuard } from './guards/group-member.guard';
import { SharedFinanceService } from './shared-finance.service';
import {
  CreateGroupDto,
  UpdateGroupDto,
  AddMemberDto,
  InviteMemberDto,
  CreateExpenseDto,
  UpdateExpenseDto,
  CreateSettlementDto,
  CompleteSettlementDto,
  CreateCoupleProfileDto,
  SendCoupleInviteDto,
  CreateTripDto,
  AddTripExpenseDto,
  CreateSubscriptionDto,
  CreateHouseholdBillDto,
  CreateContributionRuleDto,
  CreateSharedGoalDto,
  ContributeToGoalDto,
  SendMessageDto,
  UpdateSalaryProfileDto,
  TransitionStatusDto,
  RemoveMemberDto,
  RevokeInviteDto,
  CreateWalletDto,
  ContributeToWalletDto,
  SpendFromWalletDto,
  TransferWalletDto,
  ApproveWalletTransactionDto,
  CreateAdvanceContributionDto,
  RequestApprovalDto,
  ApproveExpenseDto,
  UploadDocumentDto,
  CreateCalendarEventDto,
  CreateSplitTemplateDto,
  UploadCreditCardBillDto,
  CreateCashPoolDto,
  CreateEmergencyFundDto,
  CreateNetWorthSnapshotDto,
  ExportDataDto,
  CreateReferralDto,
  TripForecastDto,
} from './dto/shared-finance.dto';

@ApiTags('Shared Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shared-finance')
export class SharedFinanceController {
  private readonly logger = new Logger(SharedFinanceController.name);

  constructor(private readonly sf: SharedFinanceService) {}

  // ─── Groups ────────────────────────────────────────────────

  @Post('groups')
  @ApiOperation({ summary: 'Create a shared group' })
  async createGroup(@CurrentUser('id') userId: string, @Body() dto: CreateGroupDto) {
    return this.sf.createGroup(userId, dto);
  }

  @Get('groups')
  @ApiOperation({ summary: 'Get all groups for current user' })
  async getUserGroups(@CurrentUser('id') userId: string) {
    return this.sf.getUserGroups(userId);
  }

  @Get('groups/:groupId')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Get group details' })
  async getGroup(@Param('groupId') groupId: string, @CurrentUser('id') userId: string) {
    return this.sf.getGroup(groupId, userId);
  }

  @Put('groups/:groupId')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Update group (admin only)' })
  async updateGroup(
    @Param('groupId') groupId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.sf.updateGroup(groupId, userId, dto);
  }

  @Delete('groups/:groupId')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Delete group (admin only)' })
  async deleteGroup(@Param('groupId') groupId: string, @CurrentUser('id') userId: string) {
    return this.sf.deleteGroup(groupId, userId);
  }

  @Post('groups/:groupId/members')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Add member to group (admin only)' })
  async addMember(
    @Param('groupId') groupId: string,
    @Body() dto: AddMemberDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.sf.addMember(groupId, dto.userId, adminId);
  }

  @Post('groups/:groupId/leave')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Leave group' })
  async leaveGroup(@Param('groupId') groupId: string, @CurrentUser('id') userId: string) {
    return this.sf.leaveGroup(groupId, userId);
  }

  @Post('groups/:groupId/invites')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Invite member via email' })
  async inviteMember(
    @Param('groupId') groupId: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.sf.inviteMember(groupId, userId, dto);
  }

  @Get('invites/:token')
  @ApiOperation({ summary: 'Validate invite token' })
  async validateInvite(@Param('token') token: string) {
    return this.sf.validateInvite(token);
  }

  @Post('invites/:token/join')
  @ApiOperation({ summary: 'Join group via invite token' })
  async joinViaInvite(@Param('token') token: string, @CurrentUser('id') userId: string) {
    return this.sf.joinViaInvite(token, userId);
  }

  // ─── Group Wallets ─────────────────────────────────────────

  @Post('groups/:groupId/wallets')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Create a group wallet' })
  async createWallet(
    @Param('groupId') groupId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWalletDto,
  ) {
    return this.sf.createWallet(groupId, userId, dto);
  }

  @Get('groups/:groupId/wallets')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Get all wallets in a group' })
  async getGroupWallets(@Param('groupId') groupId: string) {
    return this.sf.getGroupWallets(groupId);
  }

  @Get('groups/:groupId/wallets/:walletId')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Get single wallet with transactions' })
  async getWallet(@Param('groupId') _groupId: string, @Param('walletId') walletId: string) {
    return this.sf.getWallet(walletId);
  }

  @Post('groups/:groupId/wallets/:walletId/contribute')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Contribute to a group wallet' })
  async contributeToWallet(
    @Param('walletId') walletId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ContributeToWalletDto,
  ) {
    return this.sf.contributeToWallet(walletId, userId, dto);
  }

  @Post('groups/:groupId/wallets/:walletId/spend')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Spend from a group wallet' })
  async spendFromWallet(
    @Param('walletId') walletId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SpendFromWalletDto,
  ) {
    return this.sf.spendFromWallet(walletId, userId, dto);
  }

  @Post('groups/:groupId/wallets/:walletId/transfer')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Transfer between wallets' })
  async transferBetweenWallets(
    @Param('walletId') fromWalletId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: TransferWalletDto,
  ) {
    return this.sf.transferBetweenWallets(fromWalletId, dto.targetWalletId, userId, dto);
  }

  @Post('groups/:groupId/wallets/:walletId/toggle-lock')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Toggle wallet lock' })
  async toggleWalletLock(@Param('walletId') walletId: string, @CurrentUser('id') userId: string) {
    return this.sf.toggleWalletLock(walletId, userId);
  }

  @Get('groups/:groupId/wallets/:walletId/report')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Get wallet transaction report' })
  async getWalletReport(@Param('walletId') walletId: string) {
    return this.sf.getWalletReport(walletId);
  }

  @Post('groups/:groupId/wallets/transactions/:transactionId/approve')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Approve or reject a pending wallet transaction' })
  async approveWalletTransaction(
    @Param('transactionId') transactionId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ApproveWalletTransactionDto,
  ) {
    return this.sf.approveWalletTransaction(transactionId, userId, dto.action);
  }

  // ─── Expenses ──────────────────────────────────────────────

  @Post('groups/:groupId/expenses')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Create expense in group' })
  async createExpense(
    @Param('groupId') groupId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.sf.createExpense(groupId, userId, dto);
  }

  @Get('groups/:groupId/expenses')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Get all group expenses' })
  async getGroupExpenses(@Param('groupId') groupId: string) {
    return this.sf.getGroupExpenses(groupId);
  }

  @Get('expenses/:expenseId')
  @ApiOperation({ summary: 'Get single expense' })
  async getExpense(@Param('expenseId') expenseId: string) {
    return this.sf.getExpense(expenseId);
  }

  @Put('expenses/:expenseId')
  @ApiOperation({ summary: 'Update expense (creator only)' })
  async updateExpense(
    @Param('expenseId') expenseId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.sf.updateExpense(expenseId, userId, dto);
  }

  @Delete('expenses/:expenseId')
  @ApiOperation({ summary: 'Delete expense (creator only)' })
  async deleteExpense(@Param('expenseId') expenseId: string, @CurrentUser('id') userId: string) {
    return this.sf.deleteExpense(expenseId, userId);
  }

  @Get('groups/:groupId/balances')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Get balances (who owes whom)' })
  async getBalances(@Param('groupId') groupId: string) {
    return this.sf.getBalances(groupId);
  }

  // ─── Settlements ───────────────────────────────────────────

  @Get('groups/:groupId/settlements/plan')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Get optimized settlement plan' })
  async getSettlementPlan(@Param('groupId') groupId: string) {
    return this.sf.getSettlementPlan(groupId);
  }

  @Post('groups/:groupId/settlements')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Create settlement' })
  async createSettlement(@Param('groupId') groupId: string, @Body() dto: CreateSettlementDto) {
    return this.sf.createSettlement(groupId, dto.fromUserId, dto.toUserId, dto.amount, dto.method);
  }

  @Post('settlements/:settlementId/complete')
  @ApiOperation({ summary: 'Complete settlement' })
  async completeSettlement(
    @Param('settlementId') settlementId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CompleteSettlementDto,
  ) {
    return this.sf.completeSettlement(settlementId, userId);
  }

  @Get('groups/:groupId/settlements')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Get settlement history' })
  async getSettlementHistory(@Param('groupId') groupId: string) {
    return this.sf.getSettlementHistory(groupId);
  }

  // ─── Couple Finance ────────────────────────────────────────

  @Post('groups/:groupId/couple/profile')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Create couple finance profile' })
  async createCoupleProfile(
    @Param('groupId') groupId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCoupleProfileDto,
  ) {
    return this.sf.createCoupleProfile(groupId, userId, dto.partner2Id, dto);
  }

  @Get('groups/:groupId/couple/dashboard')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Get couple finance dashboard' })
  async getCoupleDashboard(@Param('groupId') groupId: string) {
    return this.sf.getCoupleDashboard(groupId);
  }

  @Post('couple/invite')
  @ApiOperation({ summary: 'Send couple finance invite' })
  async sendCoupleInvite(@CurrentUser('id') userId: string, @Body() dto: SendCoupleInviteDto) {
    return this.sf.sendCoupleInvite(userId, dto.receiverEmail);
  }

  @Post('couple/invites/:inviteId/accept')
  @ApiOperation({ summary: 'Accept couple invite' })
  async acceptCoupleInvite(@Param('inviteId') inviteId: string, @Body('groupId') groupId: string) {
    return this.sf.acceptCoupleInvite(inviteId, groupId);
  }

  @Post('salary-profile')
  @ApiOperation({ summary: 'Create or update salary profile' })
  async updateSalaryProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSalaryProfileDto,
  ) {
    return this.sf.updateSalaryProfile(userId, dto);
  }

  @Post('salary/recommended-split')
  @ApiOperation({ summary: 'Calculate recommended split ratio' })
  calculateRecommendedSplit(@Body('salary1') salary1: number, @Body('salary2') salary2: number) {
    return this.sf.calculateRecommendedSplit(salary1, salary2);
  }

  // ─── Trip Management ───────────────────────────────────────

  @Post('groups/:groupId/trip')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Create or update trip' })
  async createTrip(
    @Param('groupId') groupId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTripDto,
  ) {
    return this.sf.createTrip(groupId, userId, dto);
  }

  @Get('groups/:groupId/trip/dashboard')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Get trip dashboard' })
  async getTripDashboard(@Param('groupId') groupId: string) {
    return this.sf.getTripDashboard(groupId);
  }

  @Post('trips/:tripId/expenses')
  @ApiOperation({ summary: 'Add trip expense' })
  async addTripExpense(
    @Param('tripId') tripId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddTripExpenseDto,
  ) {
    return this.sf.addTripExpense(tripId, userId, dto);
  }

  // ─── Shared Subscriptions ──────────────────────────────────

  @Post('groups/:groupId/subscriptions')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Create shared subscription' })
  async createSubscription(
    @Param('groupId') groupId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.sf.createSubscription(groupId, userId, dto);
  }

  @Get('groups/:groupId/subscriptions')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Get group subscriptions' })
  async getGroupSubscriptions(@Param('groupId') groupId: string) {
    return this.sf.getGroupSubscriptions(groupId);
  }

  @Post('subscriptions/:subscriptionId/mark-paid')
  @ApiOperation({ summary: 'Mark subscription share as paid' })
  async markSubscriptionPaid(
    @Param('subscriptionId') subscriptionId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.sf.markSubscriptionPaid(subscriptionId, userId);
  }

  // ─── Household Bills ───────────────────────────────────────

  @Post('groups/:groupId/household/bills')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Create household bill' })
  async createHouseholdBill(
    @Param('groupId') groupId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateHouseholdBillDto,
  ) {
    return this.sf.createHouseholdBill(groupId, userId, dto);
  }

  @Get('groups/:groupId/household/bills')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Get household bills' })
  @ApiQuery({ name: 'period', required: false })
  async getHouseholdBills(@Param('groupId') groupId: string, @Query('period') period?: string) {
    return this.sf.getHouseholdBills(groupId, period);
  }

  @Post('household/bills/:billId/mark-paid')
  @ApiOperation({ summary: 'Mark household bill share as paid' })
  async markBillPaid(@Param('billId') billId: string, @CurrentUser('id') userId: string) {
    return this.sf.markBillPaid(billId, userId);
  }

  // ─── Contribution Rules ────────────────────────────────────

  @Post('groups/:groupId/contributions/rules')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Create contribution rule (admin)' })
  async createContributionRule(
    @Param('groupId') groupId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateContributionRuleDto,
  ) {
    return this.sf.createContributionRule(groupId, userId, dto);
  }

  @Get('groups/:groupId/contributions/rules')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Get contribution rules' })
  async getContributionRules(@Param('groupId') groupId: string) {
    return this.sf.getContributionRules(groupId);
  }

  @Post('groups/:groupId/contributions/rules/:ruleId/apply')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Apply contribution rule to generate expenses' })
  async applyContributionRule(@Param('groupId') groupId: string, @Param('ruleId') ruleId: string) {
    return this.sf.applyContributionRule(groupId, ruleId);
  }

  // ─── Shared Goals ──────────────────────────────────────────

  @Post('groups/:groupId/goals')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Create shared goal' })
  async createSharedGoal(
    @Param('groupId') groupId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSharedGoalDto,
  ) {
    return this.sf.createSharedGoal(groupId, userId, dto);
  }

  @Get('groups/:groupId/goals')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Get shared goals' })
  async getSharedGoals(@Param('groupId') groupId: string) {
    return this.sf.getSharedGoals(groupId);
  }

  @Post('goals/:goalId/contribute')
  @ApiOperation({ summary: 'Contribute to shared goal' })
  async contributeToGoal(
    @Param('goalId') goalId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ContributeToGoalDto,
  ) {
    return this.sf.contributeToGoal(goalId, userId, dto.amount);
  }

  // ─── Chat ──────────────────────────────────────────────────

  @Post('groups/:groupId/chat/messages')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Send message to group chat' })
  async sendMessage(
    @Param('groupId') groupId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.sf.sendMessage(groupId, userId, dto);
  }

  @Get('groups/:groupId/chat/messages')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Get group chat messages' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'before', required: false })
  async getMessages(
    @Param('groupId') groupId: string,
    @Query('limit') limit?: number,
    @Query('before') before?: string,
  ) {
    return this.sf.getMessages(groupId, limit || 50, before);
  }

  @Post('groups/:groupId/chat/messages/:messageId/pin')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Toggle pin message in group chat' })
  async pinMessage(@Param('messageId') messageId: string, @Param('groupId') groupId: string) {
    return this.sf.pinMessage(messageId, groupId);
  }

  // ─── Dashboard & Insights ──────────────────────────────────

  @Get('groups/:groupId/dashboard')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Get full group dashboard' })
  async getGroupDashboard(@Param('groupId') groupId: string) {
    return this.sf.getGroupDashboard(groupId);
  }

  @Get('groups/:groupId/insights')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Get AI-powered insights for group' })
  @ApiQuery({ name: 'period', required: false })
  async getGroupInsights(@Param('groupId') groupId: string, @Query('period') period?: string) {
    return this.sf.getGroupInsights(groupId, period);
  }

  // ─── Group Lifecycle & Security (Admin) ───────────────────

  @Patch('groups/:groupId/status')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Transition group lifecycle status (admin)' })
  async transitionStatus(
    @Param('groupId') groupId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: TransitionStatusDto,
  ) {
    return this.sf.transitionGroupStatus(groupId, userId, dto.status);
  }

  @Get('groups/:groupId/status')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Get group lifecycle status' })
  async getGroupStatus(@Param('groupId') groupId: string) {
    return this.sf.getGroupStatus(groupId);
  }

  @Post('groups/:groupId/finalize-settlements')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Finalize settlements (admin, prevents new ones)' })
  async finalizeSettlements(@Param('groupId') groupId: string, @CurrentUser('id') userId: string) {
    return this.sf.finalizeGroupSettlements(groupId, userId);
  }

  @Get('groups/:groupId/lifecycle')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Get group lifecycle event history' })
  async getLifecycleHistory(@Param('groupId') groupId: string) {
    return this.sf.getGroupLifecycleHistory(groupId);
  }

  @Get('groups/:groupId/removal-logs')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Get member removal audit logs (admin)' })
  async getRemovalLogs(@Param('groupId') groupId: string) {
    return this.sf.getMemberRemovalLogs(groupId);
  }

  @Post('groups/:groupId/revoke-invites')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Revoke all active invite tokens (admin)' })
  async revokeAllInvites(@Param('groupId') groupId: string, @CurrentUser('id') userId: string) {
    return this.sf.revokeAllInvites(groupId, userId);
  }

  @Delete('groups/:groupId/members/:memberId')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Remove member with full access revocation (admin)' })
  async removeMember(
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.sf.removeMember(groupId, memberId, adminId);
  }

  @Post('groups/:groupId/export')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Export full group report (admin)' })
  async exportGroupReport(@Param('groupId') groupId: string, @CurrentUser('id') userId: string) {
    return this.sf.exportGroupReport(groupId, userId);
  }
}
