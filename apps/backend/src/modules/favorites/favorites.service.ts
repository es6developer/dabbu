import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, contactUserId: string) {
    if (userId === contactUserId) {
      throw new BadRequestException('Cannot add yourself as a favorite');
    }

    const contact = await this.prisma.user.findUnique({
      where: { id: contactUserId, isActive: true, status: 'active' },
    });
    if (!contact) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.favoriteContact.findUnique({
      where: { userId_contactUserId: { userId, contactUserId } },
    });
    if (existing) {
      throw new ConflictException('Contact is already in favorites');
    }

    const fav = await this.prisma.favoriteContact.create({
      data: { userId, contactUserId },
      include: {
        contact: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            phone: true,
          },
        },
      },
    });

    return {
      id: fav.id,
      userId: fav.contactUserId,
      name: `${fav.contact.firstName} ${fav.contact.lastName}`.trim(),
      email: fav.contact.email,
      phone: fav.contact.phone,
      avatarUrl: fav.contact.avatarUrl,
      createdAt: fav.createdAt,
    };
  }

  async remove(userId: string, contactUserId: string) {
    const existing = await this.prisma.favoriteContact.findUnique({
      where: { userId_contactUserId: { userId, contactUserId } },
    });
    if (!existing) {
      throw new NotFoundException('Favorite contact not found');
    }
    await this.prisma.favoriteContact.delete({
      where: { userId_contactUserId: { userId, contactUserId } },
    });
    return { status: 'removed' };
  }

  async list(userId: string) {
    const favorites = await this.prisma.favoriteContact.findMany({
      where: { userId },
      include: {
        contact: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map((f) => ({
      id: f.id,
      userId: f.contactUserId,
      name: `${f.contact.firstName} ${f.contact.lastName}`.trim(),
      email: f.contact.email,
      phone: f.contact.phone,
      avatarUrl: f.contact.avatarUrl,
      createdAt: f.createdAt,
    }));
  }

  async isFavorite(userId: string, contactUserId: string): Promise<boolean> {
    const existing = await this.prisma.favoriteContact.findUnique({
      where: { userId_contactUserId: { userId, contactUserId } },
    });
    return !!existing;
  }
}
