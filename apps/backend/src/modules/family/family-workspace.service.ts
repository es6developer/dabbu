import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LensDataService } from '../../common/lens/lens-data.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

@Injectable()
export class FamilyWorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lensData: LensDataService,
  ) {}

  async create(userId: string, dto: CreateWorkspaceDto) {
    const family = await this.prisma.family.findUnique({ where: { id: dto.familyId } });
    if (!family) {
      throw new NotFoundException('Family not found');
    }
    if (family.ownerId !== userId) {
      throw new ForbiddenException('Only family owner can create workspace');
    }

    const existing = await this.prisma.familyWorkspace.findUnique({
      where: { familyId: dto.familyId },
    });
    if (existing) {
      throw new ConflictException('Family workspace already exists');
    }

    const lensId = await this.lensData.getActiveLens(userId);

    return this.prisma.familyWorkspace.create({
      data: {
        familyId: dto.familyId,
        name: dto.name,
        description: dto.description,
        icon: dto.icon || 'team',
        coverColor: dto.coverColor || '#0f6b6f',
        createdBy: userId,
        lensId,
      },
    });
  }

  async findByFamily(familyId: string) {
    return this.prisma.familyWorkspace.findUnique({ where: { familyId } });
  }

  async findById(id: string) {
    const ws = await this.prisma.familyWorkspace.findUnique({ where: { id } });
    if (!ws) {
      throw new NotFoundException('Family workspace not found');
    }
    return ws;
  }

  async update(
    id: string,
    userId: string,
    data: { name?: string; description?: string; icon?: string; coverColor?: string },
  ) {
    const ws = await this.prisma.familyWorkspace.findUnique({ where: { id } });
    if (!ws) {
      throw new NotFoundException('Family workspace not found');
    }
    const family = await this.prisma.family.findUnique({ where: { id: ws.familyId } });
    if (!family) {
      throw new NotFoundException('Family not found');
    }
    if (family.ownerId !== userId) {
      throw new ForbiddenException('Only family owner can update workspace');
    }

    return this.prisma.familyWorkspace.update({ where: { id }, data });
  }
}
