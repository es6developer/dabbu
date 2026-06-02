import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SharedFinanceService } from '../shared-finance/shared-finance.service';
import { SettlementEngine } from '../shared-finance/engines/settlement.engine';

@Injectable()
export class SettlementsService {
  private readonly logger = new Logger(SettlementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sharedFinance: SharedFinanceService,
    private readonly settlementEngine: SettlementEngine,
  ) {}

  /**
   * Generate a UPI deep link for a settlement
   */
  generateUpiLink(upiId: string, payeeName: string, amount: number, note?: string): string {
    const params = new URLSearchParams({
      pa: upiId,
      pn: payeeName,
      am: String(amount.toFixed(2)),
      cu: 'INR',
      tn: note || `Settlement via Dabbu`,
    });
    return `upi://pay?${params.toString()}`;
  }

  /**
   * Initiate Pay Now: creates a SettlementConfirmation and returns UPI deep link
   */
  async payNow(userId: string, settlementId: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true } },
        toUser: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        group: { select: { id: true, name: true } },
      },
    });
    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }
    if (settlement.fromUserId !== userId) {
      throw new ForbiddenException('Only the payer can initiate Pay Now');
    }
    if (settlement.status !== 'pending') {
      throw new BadRequestException('Settlement is already completed or verified');
    }

    // Find the payee's UPI ID from GuestMember or User
    let upiId = '';
    const guestFrom = await this.prisma.guestMember.findUnique({ where: { userId } });
    const guestTo = await this.prisma.guestMember.findUnique({
      where: { userId: settlement.toUserId },
    });

    if (guestFrom?.upiId) {
      upiId = guestFrom.upiId;
    }
    if (!upiId && settlement.toUser.phone) {
      // Try phone-based UPI (PhonePe/GPay handle phone as UPI)
      upiId = settlement.toUser.phone;
    }

    if (!upiId) {
      // Try to find user's UPI from any guest profile or default to email
      upiId = settlement.toUser.email || '';
    }

    const payeeName = `${settlement.toUser.firstName} ${settlement.toUser.lastName}`.trim();
    const amount = Number(settlement.amount);
    const upiLink = this.generateUpiLink(upiId, payeeName, amount);

    // Upsert confirmation record
    const existing = await this.prisma.settlementConfirmation.findUnique({
      where: { settlementId },
    });

    if (existing) {
      await this.prisma.settlementConfirmation.update({
        where: { id: existing.id },
        data: { upiDeepLink: upiLink },
      });
    } else {
      await this.prisma.settlementConfirmation.create({
        data: {
          settlementId,
          groupId: settlement.groupId,
          upiDeepLink: upiLink,
        },
      });
    }

    // Log activity
    await this.logActivity({
      groupId: settlement.groupId,
      userId,
      userName: `${settlement.fromUser.firstName} ${settlement.fromUser.lastName}`.trim(),
      action: 'settlement_requested',
      description: `Payment initiated via UPI — ₹${amount.toLocaleString('en-IN')}`,
      metadata: { settlementId, amount, upiLink, toUserId: settlement.toUserId },
    });

    return {
      upiLink,
      settlement: {
        id: settlement.id,
        amount,
        from: settlement.fromUser.firstName,
        to: payeeName,
        groupName: settlement.group.name,
      },
    };
  }

  /**
   * Payer confirms they sent the payment
   */
  async confirmPayment(
    userId: string,
    settlementId: string,
    dto: { paymentMethod?: string; upiTransactionId?: string; note?: string },
  ) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true } },
        toUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }
    if (settlement.fromUserId !== userId) {
      throw new ForbiddenException('Only the payer can confirm payment');
    }

    const confirmation = await this.prisma.settlementConfirmation.upsert({
      where: { settlementId },
      create: {
        settlementId,
        groupId: settlement.groupId,
        payerConfirmed: true,
        payerConfirmedAt: new Date(),
        payerNote: dto.note || null,
        paymentMethod: dto.paymentMethod || null,
        upiTransactionId: dto.upiTransactionId || null,
      },
      update: {
        payerConfirmed: true,
        payerConfirmedAt: new Date(),
        payerNote: dto.note || null,
        paymentMethod: dto.paymentMethod || null,
        upiTransactionId: dto.upiTransactionId || null,
      },
    });

    // Update settlement status to pending (waiting receiver confirmation)
    await this.prisma.settlement.update({
      where: { id: settlementId },
      data: { method: dto.paymentMethod || 'upi', status: 'pending' },
    });

    await this.logActivity({
      groupId: settlement.groupId,
      userId,
      userName: `${settlement.fromUser.firstName} ${settlement.fromUser.lastName}`.trim(),
      action: 'payment_completed',
      description: `Paid ₹${Number(settlement.amount).toLocaleString('en-IN')} to ${settlement.toUser.firstName} via ${dto.paymentMethod || 'UPI'}`,
      metadata: {
        settlementId,
        amount: Number(settlement.amount),
        transactionId: dto.upiTransactionId,
      },
    });

    return { data: confirmation };
  }

  /**
   * Receiver confirms they received the payment
   */
  async confirmReceipt(userId: string, settlementId: string, note?: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true } },
        toUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }
    if (settlement.toUserId !== userId) {
      throw new ForbiddenException('Only the receiver can confirm receipt');
    }

    const confirmation = await this.prisma.settlementConfirmation.upsert({
      where: { settlementId },
      create: {
        settlementId,
        groupId: settlement.groupId,
        receiverConfirmed: true,
        receiverConfirmedAt: new Date(),
        receiverNote: note || null,
      },
      update: {
        receiverConfirmed: true,
        receiverConfirmedAt: new Date(),
        receiverNote: note || null,
        receiverRejected: false,
        rejectionReason: null,
      },
    });

    // Mark settlement as completed
    await this.prisma.settlement.update({
      where: { id: settlementId },
      data: { status: 'completed', settledAt: new Date() },
    });

    await this.logActivity({
      groupId: settlement.groupId,
      userId,
      userName: `${settlement.toUser.firstName} ${settlement.toUser.lastName}`.trim(),
      action: 'settlement_confirmed',
      description: `Confirmed receipt of ₹${Number(settlement.amount).toLocaleString('en-IN')} from ${settlement.fromUser.firstName}`,
      metadata: { settlementId, amount: Number(settlement.amount) },
    });

    return { data: confirmation };
  }

  /**
   * Receiver rejects the payment claim
   */
  async rejectReceipt(userId: string, settlementId: string, reason: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }
    if (settlement.toUserId !== userId) {
      throw new ForbiddenException('Only the receiver can reject receipt');
    }

    await this.prisma.settlementConfirmation.upsert({
      where: { settlementId },
      create: {
        settlementId,
        groupId: settlement.groupId,
        receiverRejected: true,
        rejectionReason: reason,
        receiverConfirmedAt: new Date(),
      },
      update: {
        receiverRejected: true,
        rejectionReason: reason,
        receiverConfirmed: false,
        receiverConfirmedAt: new Date(),
      },
    });

    await this.logActivity({
      groupId: settlement.groupId,
      userId,
      userName: 'Group Member',
      action: 'settlement_confirmed',
      description: `Rejected payment claim: ${reason}`,
      metadata: { settlementId, reason },
    });

    return { data: { message: 'Payment rejected. Reason recorded.' } };
  }

  /**
   * Generate a shareable Pay Now link
   */
  async generatePayNowLink(settlementId: string, expiresInDays = 7) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true } },
        toUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const link = await this.prisma.payNowLink.create({
      data: {
        groupId: settlement.groupId,
        settlementId: settlement.id,
        fromUserId: settlement.fromUserId,
        toUserId: settlement.toUserId,
        amount: settlement.amount,
        token,
        expiresAt: new Date(Date.now() + expiresInDays * 86400000),
      },
    });

    await this.logActivity({
      groupId: settlement.groupId,
      userId: settlement.fromUserId,
      userName: `${settlement.fromUser.firstName} ${settlement.fromUser.lastName}`.trim(),
      action: 'settlement_requested',
      description: `Generated shareable payment link`,
      metadata: { settlementId, token, amount: Number(settlement.amount) },
    });

    return { token, url: `/pay/${token}` };
  }

  /**
   * Resolve a Pay Now link (public, no auth required)
   */
  async resolvePayNowLink(token: string) {
    const link = await this.prisma.payNowLink.findUnique({
      where: { token },
      include: {
        group: { select: { id: true, name: true } },
        fromUser: { select: { id: true, firstName: true, lastName: true } },
        toUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!link || link.expiresAt < new Date()) {
      throw new NotFoundException('Payment link not found or expired');
    }
    if (link.status !== 'active') {
      return { status: link.status, message: `This payment was already ${link.status}` };
    }

    // Try to find UPI ID for the receiver
    let upiId = '';
    const guest = await this.prisma.guestMember.findUnique({ where: { userId: link.toUserId } });
    if (guest?.upiId) {
      upiId = guest.upiId;
    }

    const payeeName = `${link.toUser.firstName} ${link.toUser.lastName}`.trim();
    const amount = Number(link.amount);
    const upiLink = this.generateUpiLink(upiId || link.toUser.email || '', payeeName, amount);

    return {
      groupName: link.group.name,
      amount,
      from: `${link.fromUser.firstName} ${link.fromUser.lastName}`.trim(),
      to: payeeName,
      upiLink,
      status: link.status,
      expiresAt: link.expiresAt,
    };
  }

  /**
   * Get settlement confirmation details
   */
  async getConfirmation(settlementId: string) {
    const conf = await this.prisma.settlementConfirmation.findUnique({
      where: { settlementId },
      include: {
        settlement: {
          include: {
            fromUser: { select: { id: true, firstName: true, lastName: true } },
            toUser: { select: { id: true, firstName: true, lastName: true } },
            group: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!conf) {
      throw new NotFoundException('No confirmation record found');
    }
    return conf;
  }

  /**
   * Get group activity timeline
   */
  async getActivityTimeline(groupId: string, limit = 50) {
    return this.prisma.groupActivity.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ─── Guest Member Management ────────────────────────────────

  /**
   * Create a guest member (temp user + guest profile with UPI ID)
   */
  async createGuestMember(dto: {
    name: string;
    email?: string;
    phone?: string;
    upiId?: string;
    groupId: string;
    message?: string;
  }) {
    const group = await this.prisma.sharedGroup.findUnique({ where: { id: dto.groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Create temp user
    const tempUser = await this.prisma.user.create({
      data: {
        email: dto.email || `guest-${crypto.randomBytes(8).toString('hex')}@dabbu.app`,
        password: crypto.randomBytes(32).toString('hex'),
        firstName: dto.name.split(' ')[0] || dto.name,
        lastName: dto.name.split(' ').slice(1).join(' ') || '',
        role: 'user',
        status: 'temporary',
        authProvider: 'email',
        tempGroupId: dto.groupId,
        phone: dto.phone || null,
      },
    });

    // Add them to the group
    await this.prisma.sharedGroupMember.create({
      data: { groupId: dto.groupId, userId: tempUser.id, role: 'member' },
    });

    // Create guest member profile with UPI ID
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const guest = await this.prisma.guestMember.create({
      data: {
        userId: tempUser.id,
        groupId: dto.groupId,
        name: dto.name,
        email: dto.email || null,
        phone: dto.phone || null,
        upiId: dto.upiId || null,
        inviteToken,
        inviteStatus: 'pending',
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    });

    await this.logActivity({
      groupId: dto.groupId,
      userId: tempUser.id,
      userName: dto.name,
      action: 'member_joined',
      description: `${dto.name} was invited as a guest member`,
      metadata: { guestId: guest.id, inviteToken },
    });

    return { guest, inviteToken, tempUserId: tempUser.id };
  }

  /**
   * Guest submits an expense (goes to approval queue)
   */
  async submitGuestExpense(
    userId: string,
    dto: {
      groupId: string;
      description: string;
      amount: number;
      category?: string;
      paidBy: string;
    },
  ) {
    const guest = await this.prisma.guestMember.findUnique({ where: { userId } });
    if (!guest) {
      throw new BadRequestException('Guest profile not found');
    }

    const queueEntry = await this.prisma.expenseApprovalQueue.create({
      data: {
        groupId: dto.groupId,
        guestId: userId,
        guestName: guest.name,
        description: dto.description,
        amount: dto.amount,
        category: dto.category || 'Other',
        paidBy: dto.paidBy,
        status: 'pending',
      },
    });

    await this.logActivity({
      groupId: dto.groupId,
      userId,
      userName: guest.name,
      action: 'guest_added_expense',
      description: `${guest.name} submitted expense: ${dto.description} — ₹${dto.amount.toLocaleString('en-IN')}`,
      metadata: { queueId: queueEntry.id, amount: dto.amount, description: dto.description },
    });

    return queueEntry;
  }

  /**
   * Admin approves or rejects a guest expense
   */
  async reviewGuestExpense(
    adminId: string,
    queueId: string,
    decision: 'approved' | 'rejected',
    reason?: string,
  ) {
    const entry = await this.prisma.expenseApprovalQueue.findUnique({
      where: { id: queueId },
      include: { group: { select: { name: true } } },
    });
    if (!entry) {
      throw new NotFoundException('Approval entry not found');
    }

    // Verify admin
    const admin = await this.prisma.sharedGroupMember.findUnique({
      where: { groupId_userId: { groupId: entry.groupId, userId: adminId } },
    });
    if (!admin || admin.role !== 'admin') {
      throw new ForbiddenException('Only group admins can review expenses');
    }

    await this.prisma.expenseApprovalQueue.update({
      where: { id: queueId },
      data: {
        status: decision,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectReason: decision === 'rejected' ? reason || null : null,
      },
    });

    if (decision === 'approved') {
      // Create the actual expense
      await this.sharedFinance.createExpense(entry.groupId, adminId, {
        description: entry.description,
        amount: Number(entry.amount),
        paidBy: entry.paidBy,
        category: entry.category,
        splitType: 'equal',
        date: new Date().toISOString(),
        splits: [],
        notes: `Approved guest expense from ${entry.guestName}`,
      });
    }

    await this.logActivity({
      groupId: entry.groupId,
      userId: adminId,
      userName: 'Admin',
      action: decision === 'approved' ? 'guest_approved' : 'guest_approved',
      description: `${decision === 'approved' ? 'Approved' : 'Rejected'} expense from ${entry.guestName}: ${entry.description}`,
      metadata: { queueId, decision, reason: reason || null },
    });

    return { status: decision, entry };
  }

  /**
   * Get pending approval queue for a group
   */
  async getPendingApprovals(groupId: string) {
    return this.prisma.expenseApprovalQueue.findMany({
      where: { groupId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get or create a guest dashboard view (public data for guest)
   */
  async getGuestDashboard(userId: string, groupId: string) {
    const guest = await this.prisma.guestMember.findUnique({ where: { userId } });
    const group = await this.prisma.sharedGroup.findUnique({
      where: { id: groupId },
      select: { id: true, name: true, totalSpent: true, type: true },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Get balances
    const expenses = await this.prisma.sharedExpense.findMany({
      where: { groupId },
      include: { splits: true, payer: { select: { firstName: true, lastName: true } } },
    });
    const members = await this.prisma.sharedGroupMember.findMany({
      where: { groupId, isActive: true },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    const balances = this.settlementEngine.calculateBalances(expenses, members);
    const settlements = this.settlementEngine.calculateOptimizedSettlements(balances);

    const userBalance = balances.find((b: any) => b.userId === userId);

    return {
      groupName: group.name,
      totalExpenses: Number(group.totalSpent || 0),
      memberCount: members.length,
      guestName: guest?.name || 'Guest',
      currentBalance: userBalance?.balance || 0,
      paid: userBalance?.paid || 0,
      owes: userBalance?.owes || 0,
      settles: settlements,
      recentActivity: await this.getActivityTimeline(groupId, 10),
    };
  }

  /**
   * Update guest member's UPI ID
   */
  async updateUpiId(userId: string, upiId: string) {
    const guest = await this.prisma.guestMember.findUnique({ where: { userId } });
    if (!guest) {
      throw new NotFoundException('Guest profile not found');
    }

    return this.prisma.guestMember.update({
      where: { id: guest.id },
      data: { upiId, settlementPreference: 'upi' },
    });
  }

  // ─── Activity Logging ────────────────────────────────────────

  private async logActivity(params: {
    groupId: string;
    userId: string;
    userName: string;
    action: string;
    description: string;
    metadata?: any;
  }) {
    try {
      await this.prisma.groupActivity.create({ data: params });
    } catch (e) {
      this.logger.warn(`Failed to log activity: ${e}`);
    }
  }
}
