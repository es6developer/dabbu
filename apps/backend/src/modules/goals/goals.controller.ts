import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GoalsService } from './goals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PremiumService } from '../premium/premium.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { ContributeToGoalDto } from './dto/contribute-goal.dto';

@ApiTags('Goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(
    private readonly goalsService: GoalsService,
    private readonly premiumService: PremiumService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new financial goal' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateGoalDto) {
    const goal = await this.goalsService.create(userId, dto);
    await this.premiumService.incrementUsage(userId, 'goals');
    return { data: goal };
  }

  @Get()
  @ApiOperation({ summary: 'List all goals for the current user' })
  async findAll(@CurrentUser('id') userId: string) {
    const goals = await this.goalsService.findAll(userId);
    return { data: goals };
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get goal templates for quick-creation' })
  async getTemplates() {
    return { data: this.goalsService.getTemplates() };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get goal statistics (total saved, progress, etc.)' })
  async getStats(@CurrentUser('id') userId: string) {
    const stats = await this.goalsService.getStats(userId);
    return { data: stats };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single goal by ID' })
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const goal = await this.goalsService.findOne(userId, id);
    return { data: goal };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a goal' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    const goal = await this.goalsService.update(userId, id, dto);
    return { data: goal };
  }

  @Post(':id/contribute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Contribute money towards a goal' })
  async contribute(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ContributeToGoalDto,
  ) {
    const goal = await this.goalsService.contribute(userId, id, dto.amount);
    return { data: goal };
  }

  @Post(':id/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle goal completion status' })
  async toggleComplete(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const goal = await this.goalsService.toggleComplete(userId, id);
    return { data: goal };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a goal' })
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.goalsService.remove(userId, id);
  }
}
