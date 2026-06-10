import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NlpEngine } from './engines/nlp-engine';
import { HeuristicEngine } from './engines/heuristic-engine';

@Injectable()
export class SmsDetectionService {
  private readonly logger = new Logger(SmsDetectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nlpEngine: NlpEngine,
    private readonly heuristicEngine: HeuristicEngine,
  ) {}

  async getDetections(userId: string) {
    try {
      const detections = await this.prisma.smsDetection.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const categoryIds = [
        ...new Set(detections.map((d) => d.categoryId).filter((id): id is string => !!id)),
      ];
      const categories =
        categoryIds.length > 0
          ? await this.prisma.transactionCategory.findMany({
              where: { id: { in: categoryIds } },
              select: { id: true, name: true },
            })
          : [];
      const catMap = new Map(categories.map((c) => [c.id, c.name]));

      const enriched = detections.map((d) => ({
        ...d,
        category:
          d.categoryId && catMap.has(d.categoryId) ? { name: catMap.get(d.categoryId) } : null,
      }));

      const totalDetected = enriched.length;
      const autoCategorized = enriched.filter((d) => d.categoryId).length;
      const pendingReview = enriched.filter((d) => !d.categoryId).length;

      const now = new Date();
      const thisMonth = enriched.filter((d) => {
        const dDate = new Date(d.createdAt);
        return dDate.getMonth() === now.getMonth() && dDate.getFullYear() === now.getFullYear();
      }).length;

      return {
        data: enriched,
        stats: { totalDetected, autoCategorized, pendingReview, thisMonth },
      };
    } catch (err) {
      this.logger.error('Failed to get detections', err);
      throw new InternalServerErrorException('Failed to load SMS detections');
    }
  }

  async parseAndSave(userId: string, message: string, sender: string) {
    try {
      const parsed = this.nlpEngine.parse(message, sender);
      if (!parsed) {
        return { parsed: null, message: 'Could not parse SMS' };
      }

      if (parsed.isSpam || parsed.isPromotional) {
        this.logger.log(
          `Skipped spam/promotional SMS in parseAndSave from ${sender}: "${message.slice(0, 80)}"`,
        );
        return { parsed: null, message: 'Spam or promotional SMS — skipped' };
      }

      const categorization = this.heuristicEngine.categorize(parsed);
      const categoryId = await this.lookupCategoryId(userId, categorization);

      const existing = await this.prisma.smsDetection.findFirst({
        where: { userId, messageBody: message },
      });

      if (existing) {
        this.logger.warn(`Duplicate SMS body in parseAndSave for user ${userId}`);
        return { parsed, categorization, detection: existing, message: 'Already processed' };
      }

      const detection = await this.prisma.smsDetection.create({
        data: {
          userId,
          sender,
          messageBody: message,
          detectedAmount: parsed.amount,
          detectedCurrency: parsed.currency,
          detectedType:
            categorization?.categoryType === 'income'
              ? 'income'
              : ['credit', 'refund', 'cashback'].includes(parsed.transactionType)
                ? 'income'
                : 'expense',
          confidence: parsed.confidence,
          categoryId,
          rawData: { parsed, categorization } as any,
        },
      });

      this.logger.log(
        `SMS parsed and saved: ${detection.id} amount=${parsed.amount} type=${parsed.transactionType}`,
      );
      return { parsed, categorization, detection };
    } catch (err) {
      this.logger.error('Failed to parse and save SMS', err);
      throw new InternalServerErrorException('Failed to process SMS');
    }
  }

  async detectAndCreateTransaction(userId: string, message: string, sender: string) {
    try {
      const parsed = this.nlpEngine.parse(message, sender);
      if (!parsed) {
        this.logger.warn(`Could not parse SMS from ${sender}`);
        return { success: false, message: 'Could not parse SMS' };
      }

      if (parsed.isSpam || parsed.isPromotional) {
        this.logger.log(`Skipped spam/promotional SMS from ${sender}: "${message.slice(0, 80)}"`);
        return { success: false, message: 'Spam or promotional SMS — skipped', isSpam: true };
      }

      const categorization = this.heuristicEngine.categorize(parsed);
      const categoryId = await this.lookupCategoryId(userId, categorization);

      const existing = await this.prisma.smsDetection.findFirst({
        where: { userId, messageBody: message },
      });

      if (existing) {
        this.logger.warn(`Duplicate SMS body detected for user ${userId}`);
        return { success: false, message: 'Duplicate SMS — already processed', existing };
      }

      const account = await this.prisma.account.findFirst({
        where: { userId, isActive: true, isArchived: false, isDeleted: false },
        orderBy: { sortOrder: 'asc' },
      });

      const txType =
        categorization?.categoryType === 'income'
          ? 'income'
          : ['credit', 'refund', 'cashback'].includes(parsed.transactionType)
            ? 'income'
            : 'expense';

      const [transaction, detection] = await this.prisma.$transaction([
        this.prisma.transaction.create({
          data: {
            userId,
            accountId: account?.id || null,
            categoryId,
            amount: parsed.amount,
            type: txType,
            status: 'completed',
            date: new Date(),
            description: parsed.merchantName
              ? `${parsed.merchantName} - ${parsed.bankName || sender}`
              : `SMS transaction - ${parsed.bankName || sender}`,
            isRecurring: parsed.isRecurring,
            recurringFrequency: parsed.recurringFrequency,
            notes: message.slice(0, 500),
            metadata: { source: 'sms_detection', sender, rawMatch: parsed.rawMatch },
          },
        }),
        this.prisma.smsDetection.create({
          data: {
            userId,
            sender,
            messageBody: message,
            detectedAmount: parsed.amount,
            detectedCurrency: parsed.currency,
            detectedType: txType,
            confidence: parsed.confidence,
            categoryId,
            isProcessed: true,
            processedAt: new Date(),
            rawData: { parsed, categorization } as any,
          },
        }),
      ]);

      await this.prisma.smsDetection.update({
        where: { id: detection.id },
        data: { transactionId: transaction.id },
      });

      this.logger.log(
        `Transaction created from SMS: ${transaction.id} amount=${parsed.amount} type=${txType}`,
      );
      return { success: true, parsed, categorization, detection, transaction };
    } catch (err) {
      this.logger.error('Failed to detect and create transaction from SMS', err);
      throw new InternalServerErrorException('Failed to process SMS transaction');
    }
  }

  async addTransactionFromDetection(userId: string, detectionId: string) {
    try {
      const detection = await this.prisma.smsDetection.findFirst({
        where: { id: detectionId, userId },
      });

      if (!detection) {
        return { success: false, message: 'Detection not found' };
      }

      if (detection.isProcessed) {
        return { success: false, message: 'Already processed' };
      }

      if (!detection.detectedAmount) {
        return { success: false, message: 'No amount detected' };
      }

      const account = await this.prisma.account.findFirst({
        where: { userId, isActive: true, isArchived: false, isDeleted: false },
        orderBy: { sortOrder: 'asc' },
      });

      const transaction = await this.prisma.transaction.create({
        data: {
          userId,
          accountId: account?.id || null,
          categoryId: detection.categoryId,
          amount: detection.detectedAmount,
          type: detection.detectedType || 'expense',
          status: 'completed',
          date: new Date(),
          description: `SMS: ${detection.sender}`,
          notes: detection.messageBody.slice(0, 500),
          metadata: { source: 'sms_detection_manual', sender: detection.sender },
        },
      });

      await this.prisma.smsDetection.update({
        where: { id: detection.id },
        data: {
          isProcessed: true,
          processedAt: new Date(),
          transactionId: transaction.id,
        },
      });

      this.logger.log(
        `Transaction manually created from SMS detection: ${transaction.id} amount=${detection.detectedAmount}`,
      );
      return { success: true, transaction, detection };
    } catch (err) {
      this.logger.error('Failed to create transaction from detection', err);
      throw new InternalServerErrorException('Failed to create transaction');
    }
  }

  private async lookupCategoryId(userId: string, categorization: any): Promise<string | null> {
    if (!categorization?.categoryName) {
      return null;
    }

    const catName = categorization.categoryName;

    // Map heuristic category names to existing DB category names
    const nameAliases: Record<string, string[]> = {
      'Bills & Utilities': ['Utilities', 'Bills & Utilities'],
      'Food & Dining': ['Food & Dining'],
      'Health & Medical': ['Health', 'Health & Medical'],
      'Other Income': ['Other Income', 'Miscellaneous'],
      'Other Expenses': ['Other Expenses', 'Miscellaneous'],
      Housing: ['Rent', 'Housing'],
      Financial: ['EMI / Loans', 'Financial', 'Miscellaneous'],
      Transfers: ['Transfers', 'Miscellaneous'],
      Refunds: ['Refunds', 'Miscellaneous'],
      Pets: ['Pets', 'Miscellaneous'],
      Travel: ['Travel', 'Miscellaneous'],
      Clothing: ['Clothing', 'Shopping'],
    };

    const aliases = nameAliases[catName] || [catName];

    try {
      // Try aliases in order
      for (const alias of aliases) {
        const exact = await this.prisma.transactionCategory.findFirst({
          where: { userId, name: alias, isActive: true },
        });
        if (exact) {
          return exact.id;
        }
      }

      // Try bidirectional contains as fallback
      const all = await this.prisma.transactionCategory.findMany({
        where: { userId, isActive: true },
        select: { id: true, name: true },
      });

      const match = all.find((c) =>
        aliases.some(
          (a) =>
            c.name.toLowerCase().includes(a.toLowerCase()) ||
            a.toLowerCase().includes(c.name.toLowerCase()),
        ),
      );
      if (match) {
        return match.id;
      }

      // Final fallback: first default category ordered by sortOrder
      const defaultCategory = await this.prisma.transactionCategory.findFirst({
        where: { userId, isDefault: true, isActive: true },
        orderBy: { sortOrder: 'asc' as const },
      });

      return defaultCategory?.id || null;
    } catch (err) {
      this.logger.warn('Failed to lookup category', err);
      return null;
    }
  }
}
