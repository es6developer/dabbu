import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SettlementsService } from './settlements.service';
import {
  PayNowDto,
  ConfirmPaymentDto,
  ConfirmReceiptDto,
  RejectReceiptDto,
  GeneratePayNowLinkDto,
  CreateGuestMemberDto,
  GuestExpenseSubmissionDto,
  ApproveGuestExpenseDto,
  AddUpiIdDto,
} from './dto/settlements.dto';

@ApiTags('Settlements')
@Controller('settlements')
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Post('pay-now')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Pay Now for a settlement' })
  async initiatePayNow(@Req() req: any, @Body() dto: PayNowDto) {
    return this.settlementsService.payNow(req.user.id, dto.settlementId);
  }

  @Post('confirm-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Payer confirms they made the payment' })
  async confirmPayment(@Req() req: any, @Body() dto: ConfirmPaymentDto) {
    return this.settlementsService.confirmPayment(req.user.id, dto.settlementId, {
      paymentMethod: dto.paymentMethod,
      upiTransactionId: dto.upiTransactionId,
      note: dto.note,
    });
  }

  @Post('confirm-receipt')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Receiver confirms they received payment' })
  async confirmReceipt(@Req() req: any, @Body() dto: ConfirmReceiptDto) {
    return this.settlementsService.confirmReceipt(req.user.id, dto.settlementId, dto.note);
  }

  @Post('reject-receipt')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Receiver rejects payment claim' })
  async rejectReceipt(@Req() req: any, @Body() dto: RejectReceiptDto) {
    return this.settlementsService.rejectReceipt(req.user.id, dto.settlementId, dto.reason);
  }

  @Get('confirmation/:settlementId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get settlement confirmation details' })
  async getConfirmation(@Param('settlementId', ParseUUIDPipe) settlementId: string) {
    return this.settlementsService.getConfirmation(settlementId);
  }

  @Post('generate-link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a shareable Pay Now link' })
  async generatePayNowLink(@Body() dto: GeneratePayNowLinkDto) {
    return this.settlementsService.generatePayNowLink(dto.settlementId, dto.expiresInDays);
  }

  @Get('pay/:token')
  @ApiOperation({ summary: 'Resolve a public Pay Now link (no auth required)' })
  async resolvePayNowLink(@Param('token') token: string) {
    return this.settlementsService.resolvePayNowLink(token);
  }

  @Get('activity/:groupId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get activity timeline for a group' })
  async getActivityTimeline(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Query('limit') limit?: string,
  ) {
    return this.settlementsService.getActivityTimeline(groupId, limit ? parseInt(limit, 10) : 50);
  }

  // ─── Guest Member Endpoints ────────────────────────

  @Post('guest/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a guest member with UPI ID' })
  async createGuestMember(@Body() dto: CreateGuestMemberDto) {
    return this.settlementsService.createGuestMember(dto);
  }

  @Post('guest/expense')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Guest submits an expense (goes to approval queue)' })
  async submitGuestExpense(@Req() req: any, @Body() dto: GuestExpenseSubmissionDto) {
    return this.settlementsService.submitGuestExpense(req.user.id, dto);
  }

  @Post('guest/review-expense')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin approves/rejects a guest expense' })
  async reviewGuestExpense(@Req() req: any, @Body() dto: ApproveGuestExpenseDto) {
    return this.settlementsService.reviewGuestExpense(
      req.user.id,
      dto.queueId,
      dto.decision as 'approved' | 'rejected',
      dto.reason,
    );
  }

  @Get('guest/approvals/:groupId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending guest expense approvals' })
  async getPendingApprovals(@Param('groupId', ParseUUIDPipe) groupId: string) {
    return this.settlementsService.getPendingApprovals(groupId);
  }

  @Get('guest/dashboard/:groupId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get guest dashboard view' })
  async getGuestDashboard(@Req() req: any, @Param('groupId', ParseUUIDPipe) groupId: string) {
    return this.settlementsService.getGuestDashboard(req.user.id, groupId);
  }

  @Post('guest/upi')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update guest UPI ID' })
  async updateUpiId(@Req() req: any, @Body() dto: AddUpiIdDto) {
    return this.settlementsService.updateUpiId(req.user.id, dto.upiId);
  }

  // ─── Public Guest Endpoints (no auth required) ──────────

  @Post('guest/pay/:token')
  @ApiOperation({ summary: 'Guest initiates payment via shareable link (public)' })
  async guestPayNow(@Param('token') token: string, @Body() dto: { upiId?: string }) {
    return this.settlementsService.guestPayNow(token, dto.upiId);
  }

  @Post('guest/confirm')
  @ApiOperation({ summary: 'Guest confirms settlement (public)' })
  async guestConfirmSettlement(@Body() dto: { settlementId: string; reason?: string }) {
    return this.settlementsService.confirmReceipt('guest', dto.settlementId, dto.reason);
  }

  @Post('guest/reject')
  @ApiOperation({ summary: 'Guest rejects settlement (public)' })
  async guestRejectSettlement(@Body() dto: { settlementId: string; reason: string }) {
    return this.settlementsService.rejectReceipt('guest', dto.settlementId, dto.reason);
  }

  @Get('guest/dashboard/:groupId')
  @ApiOperation({ summary: 'Get guest dashboard (public)' })
  async getPublicGuestDashboard(@Param('groupId', ParseUUIDPipe) groupId: string) {
    return this.settlementsService.getGuestDashboard('guest', groupId);
  }

  // ─── Reminders & Summary ────────────────────────────

  @Get('reminders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment reminders for current user' })
  async getPaymentReminders(@Req() req: any) {
    return this.settlementsService.getPaymentReminders(req.user.id);
  }

  @Get('reminders/:settlementId/text')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate WhatsApp reminder text for a settlement' })
  async generateReminderText(
    @Req() req: any,
    @Param('settlementId', ParseUUIDPipe) settlementId: string,
  ) {
    return this.settlementsService.generateReminderText(req.user.id, settlementId);
  }

  @Get('summary/:groupId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get group summary report' })
  async getGroupSummary(@Param('groupId', ParseUUIDPipe) groupId: string) {
    return this.settlementsService.getGroupSummary(groupId);
  }

  @Get('conversion-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check guest-to-user conversion eligibility' })
  async getConversionStatus(@Req() req: any) {
    return this.settlementsService.getConversionStatus(req.user.id);
  }
}
