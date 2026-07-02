import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SpacesService } from './spaces.service';
import { SpacesMigrationService } from './spaces-migration.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { MigrateDto } from './dto/migrate.dto';

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
    @Body() dto: CreateSpaceDto,
    @CurrentUser('id') userId: string,
  ) {
    const space = await this.spacesService.create(dto, userId);
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
    @Body() dto: AddMemberDto,
    @CurrentUser('id') userId: string,
  ) {
    const member = await this.spacesService.addMember(id, dto.userId, userId, dto.role);
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

  @Patch(':id')
  @ApiOperation({ summary: 'Update space (name, icon, coverColor)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSpaceDto,
    @CurrentUser('id') userId: string,
  ) {
    const space = await this.spacesService.update(id, userId, dto);
    return { data: space };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a space' })
  async deleteSpace(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const result = await this.spacesService.deleteSpace(id, userId);
    return result;
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate / set as active space' })
  async activate(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const result = await this.spacesService.activate(id, userId);
    return result;
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Get transactions for a space' })
  async getTransactions(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const transactions = await this.spacesService.getTransactions(id, userId);
    return { data: transactions };
  }

  @Get(':id/goals')
  @ApiOperation({ summary: 'Get goals for a space' })
  async getGoals(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const goals = await this.spacesService.getGoals(id, userId);
    return { data: goals };
  }

  @Get(':id/budgets')
  @ApiOperation({ summary: 'Get budgets for a space' })
  async getBudgets(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const budgets = await this.spacesService.getBudgets(id, userId);
    return { data: budgets };
  }

  @Post('default')
  @ApiOperation({ summary: 'Create default personal space' })
  async createDefault(@CurrentUser('id') userId: string) {
    const space = await this.spacesService.createDefault(userId);
    return { data: space };
  }

  @Post('migrate')
  @ApiOperation({ summary: 'Migrate legacy couple/family data to spaces' })
  async migrate(
    @Body() dto: MigrateDto,
    @CurrentUser('id') userId: string,
  ) {
    const target = dto.target || 'all';
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
