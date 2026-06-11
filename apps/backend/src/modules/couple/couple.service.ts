import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SharedFinanceService } from '../shared-finance/shared-finance.service';

@Injectable()
export class CoupleService {
  private readonly logger = new Logger(CoupleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sharedFinanceService: SharedFinanceService,
  ) {}

  async addPartner(userId: string, partnerEmail: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isCouple) {
      throw new ConflictException('You are already in a couple');
    }

    const partner = await this.prisma.user.findUnique({ where: { email: partnerEmail } });
    if (!partner) {
      throw new NotFoundException('No user found with that email');
    }
    if (partner.id === userId) {
      throw new BadRequestException('Cannot add yourself as partner');
    }
    if (partner.isCouple) {
      throw new ConflictException('This user is already in a couple');
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          partnerId: partner.id,
          isCouple: true,
          isCoupleMode: true,
          partnerLinkedAt: now,
        },
      });
      await tx.user.update({
        where: { id: partner.id },
        data: {
          partnerId: userId,
          isCouple: true,
          isCoupleMode: false,
          partnerLinkedAt: now,
        },
      });

      const groupName = `${user.firstName} & ${partner.firstName}'s Space`;
      await this.sharedFinanceService.createGroup(userId, {
        name: groupName,
        type: 'couple',
        currency: 'INR',
      });
    });

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        phone: true,
        isCouple: true,
        isCoupleMode: true,
        partnerLinkedAt: true,
        partner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return updatedUser;
  }

  async toggleMode(userId: string, isCoupleMode: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.isCouple) {
      throw new BadRequestException('You are not in a couple');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isCoupleMode },
      select: {
        id: true,
        isCouple: true,
        isCoupleMode: true,
      },
    });

    return updated;
  }

  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isCouple: true,
        isCoupleMode: true,
        partnerLinkedAt: true,
        partner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            isCoupleMode: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async removePartner(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isCouple: true, partnerId: true },
    });
    if (!user || !user.isCouple || !user.partnerId) {
      throw new BadRequestException('You are not in a couple');
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          partnerId: null,
          isCouple: false,
          isCoupleMode: false,
          partnerLinkedAt: null,
        },
      });
      await tx.user.update({
        where: { id: user.partnerId! },
        data: {
          partnerId: null,
          isCouple: false,
          isCoupleMode: false,
          partnerLinkedAt: null,
        },
      });
    });

    return { message: 'Couple relationship removed' };
  }
}
