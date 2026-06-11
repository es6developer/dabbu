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

  async sendRequest(userId: string, phone: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isCouple) {
      throw new ConflictException('You are already in a couple');
    }

    const receiver = await this.prisma.user.findFirst({
      where: { phone, isActive: true },
    });
    if (!receiver) {
      throw new NotFoundException('No user found with that phone number');
    }
    if (receiver.id === userId) {
      throw new BadRequestException('Cannot send request to yourself');
    }
    if (receiver.isCouple) {
      throw new ConflictException('This user is already in a couple');
    }

    const existing = await this.prisma.coupleRequest.findUnique({
      where: { senderId_receiverId: { senderId: userId, receiverId: receiver.id } },
    });
    if (existing && existing.status === 'pending') {
      throw new ConflictException('Request already sent. Waiting for approval.');
    }
    if (existing && existing.status === 'approved') {
      throw new ConflictException('You are already connected with this user');
    }

    await this.prisma.coupleRequest.upsert({
      where: { senderId_receiverId: { senderId: userId, receiverId: receiver.id } },
      update: { status: 'pending' },
      create: {
        senderId: userId,
        receiverId: receiver.id,
        status: 'pending',
      },
    });

    return {
      message: 'Couple request sent! Waiting for approval.',
      receiver: {
        id: receiver.id,
        firstName: receiver.firstName,
        lastName: receiver.lastName,
        phone: receiver.phone,
      },
    };
  }

  async approveRequest(userId: string, requestId: string) {
    const request = await this.prisma.coupleRequest.findUnique({
      where: { id: requestId },
      include: {
        sender: { select: { id: true, firstName: true, isCouple: true } },
        receiver: { select: { id: true, firstName: true, isCouple: true } },
      },
    });
    if (!request) {
      throw new NotFoundException('Request not found');
    }
    if (request.receiverId !== userId) {
      throw new BadRequestException('This request was not sent to you');
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('Request is no longer pending');
    }
    if (request.sender.isCouple || request.receiver.isCouple) {
      throw new ConflictException('One of the users is already in a couple');
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.coupleRequest.update({
        where: { id: requestId },
        data: { status: 'approved' },
      });

      await tx.user.update({
        where: { id: request.senderId },
        data: {
          partnerId: request.receiverId,
          isCouple: true,
          isCoupleMode: true,
          partnerLinkedAt: now,
        },
      });

      await tx.user.update({
        where: { id: request.receiverId },
        data: {
          partnerId: request.senderId,
          isCouple: true,
          isCoupleMode: false,
          partnerLinkedAt: now,
        },
      });

      const groupName = `${request.sender.firstName} & ${request.receiver.firstName}'s Space`;
      await this.sharedFinanceService.createGroup(request.senderId, {
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

    return {
      message: 'Couple request approved! You are now connected.',
      user: updatedUser,
    };
  }

  async rejectRequest(userId: string, requestId: string) {
    const request = await this.prisma.coupleRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('Request not found');
    }
    if (request.receiverId !== userId) {
      throw new BadRequestException('This request was not sent to you');
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('Request is no longer pending');
    }

    await this.prisma.coupleRequest.update({
      where: { id: requestId },
      data: { status: 'rejected' },
    });

    return { message: 'Request rejected' };
  }

  async cancelRequest(userId: string, requestId: string) {
    const request = await this.prisma.coupleRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('Request not found');
    }
    if (request.senderId !== userId) {
      throw new BadRequestException('You can only cancel your own requests');
    }

    await this.prisma.coupleRequest.delete({ where: { id: requestId } });

    return { message: 'Request cancelled' };
  }

  async listRequests(userId: string) {
    const [sent, received] = await Promise.all([
      this.prisma.coupleRequest.findMany({
        where: { senderId: userId },
        include: {
          receiver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupleRequest.findMany({
        where: { receiverId: userId },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { sent, received };
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
      select: { id: true, isCouple: true, isCoupleMode: true },
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
