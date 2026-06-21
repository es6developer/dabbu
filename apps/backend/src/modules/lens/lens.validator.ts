import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class LensValidator {
  constructor(private readonly prisma: PrismaService) {}

  async validateLensAccess(userId: string, targetLens: string): Promise<void> {
    switch (targetLens) {
      case 'PARTNERED': {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { isCouple: true, partnerId: true },
        });
        if (!user?.isCouple || !user?.partnerId) {
          throw new BadRequestException(
            "PARTNERED lens requires an active partner connection. Link with a partner first.",
          );
        }
        break;
      }
      case 'FAMILY': {
        const membership = await this.prisma.familyMember.findFirst({
          where: { userId },
        });
        if (!membership) {
          throw new BadRequestException(
            "FAMILY lens requires an active family. Create or join a family first.",
          );
        }
        break;
      }
      case 'PERSONAL':
      case 'FULL':
        break;
      default:
        throw new BadRequestException(`Invalid lens type: ${targetLens}`);
    }
  }

  async validateLensChange(userId: string, fromLens: string, toLens: string): Promise<void> {
    if (fromLens === toLens) {
      throw new BadRequestException(`Already on ${toLens} lens`);
    }
    await this.validateLensAccess(userId, toLens);
  }
}
