import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SpacesService } from './spaces.service';
import { SpacesMigrationService } from './spaces-migration.service';

@ApiTags('Spaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('spaces')
export class SpacesController {
  constructor(
    private readonly spacesService: SpacesService,
    private readonly spacesMigrationService: SpacesMigrationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all spaces for current user' })
  async list(@CurrentUser('id') userId: string) {
    const spaces = await this.spacesService.list(userId);
    return { data: spaces };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new space' })
  async create(
    @Body() body: { name: string; type: string; icon?: string; coverColor?: string },
    @CurrentUser('id') userId: string,
  ) {
    const space = await this.spacesService.create(body, userId);
    return { data: space };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get space details' })
  async getById(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const space = await this.spacesService.getById(id, userId);
    return { data: space };
  }

  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Get space dashboard data' })
  async getDashboard(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const data = await this.spacesService.getDashboard(id, userId);
    return { data };
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member to the space' })
  async addMember(
    @Param('id') id: string,
    @Body() body: { userId: string; role?: string },
    @CurrentUser('id') userId: string,
  ) {
    const member = await this.spacesService.addMember(id, body.userId, userId, body.role);
    return { data: member };
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from the space' })
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.spacesService.removeMember(id, memberId, userId);
    return result;
  }

  @Post('migrate')
  @ApiOperation({ summary: 'Migrate legacy couple/family data to spaces' })
  async migrate(
    @Body() body: { target?: 'couple' | 'family' | 'all' },
    @CurrentUser('id') userId: string,
  ) {
    const target = body.target || 'all';
    let result: unknown;
    if (target === 'couple') {
      result = await this.spacesMigrationService.migrateCoupleToSpace(userId);
    } else if (target === 'family') {
      result = await this.spacesMigrationService.migrateFamilyToSpace(userId);
    } else {
      result = await this.spacesMigrationService.migrateAll(userId);
    }
    return { data: result };
  }
}
