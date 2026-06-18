import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createTicket(data: {
    userId?: string;
    email?: string;
    subject: string;
    message: string;
    category: string;
    priority?: string;
    attachmentUrls?: string[];
  }) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId: data.userId || null,
        email: data.email || null,
        subject: data.subject,
        message: data.message,
        category: data.category,
        priority: data.priority || 'medium',
        status: 'open',
      },
    });
    this.logger.log(`Support ticket created: ${ticket.id} - ${data.subject}`);
    return ticket;
  }

  async getUserTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTicketById(userId: string, ticketId: string) {
    return this.prisma.supportTicket.findFirst({
      where: { id: ticketId, userId },
    });
  }

  async submitFeedback(data: {
    userId: string;
    type: 'feedback' | 'bug_report' | 'feature_request';
    message: string;
    rating?: number;
    screenName?: string;
  }) {
    return this.prisma.supportTicket.create({
      data: {
        userId: data.userId,
        subject: data.type === 'bug_report' ? 'Bug Report' : data.type === 'feature_request' ? 'Feature Request' : 'Feedback',
        message: data.message,
        category: data.type === 'bug_report' ? 'bug' : data.type === 'feature_request' ? 'feature' : 'general',
        priority: 'low',
        status: 'open',
      },
    });
  }

  async getFAQs() {
    return [
      { id: '1', question: 'How do I add a transaction?', answer: 'Tap the + button on the home screen and select income or expense. Fill in the amount, category, and optional notes.', category: 'transactions' },
      { id: '2', question: 'How do I create a budget?', answer: 'Go to the Budgets tab, tap "Create Budget", select a category, set your monthly limit, and save.', category: 'budgets' },
      { id: '3', question: 'How does shared finance work?', answer: 'Create a group, invite members via link or email, add expenses together, and settle up easily.', category: 'shared-finance' },
      { id: '4', question: 'How do I connect with my partner?', answer: 'Go to Couple Space, generate an invite code, and share it with your partner. They enter the code to connect.', category: 'couple' },
      { id: '5', question: 'How do I export my data?', answer: 'Go to Settings > Privacy > Export Data. You can export as JSON or PDF.', category: 'settings' },
      { id: '6', question: 'How do I cancel my subscription?', answer: 'Go to Premium > Manage Subscription and tap Cancel. Your premium features will remain active until the end of the billing period.', category: 'premium' },
      { id: '7', question: 'Is my data secure?', answer: 'Yes. All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Documents are encrypted with per-file keys.', category: 'security' },
      { id: '8', question: 'How do I delete my account?', answer: 'Go to Settings > Privacy > Delete Account. Your data will be permanently deleted within 30 days.', category: 'account' },
    ];
  }
}
