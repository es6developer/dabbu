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
import { BudgetsService } from './budgets.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PremiumService } from '../premium/premium.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@ApiTags('Budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(
    private readonly budgetsService: BudgetsService,
    private readonly premiumService: PremiumService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new budget' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateBudgetDto) {
    const budget = await this.budgetsService.create(userId, dto);
    await this.premiumService.incrementUsage(userId, 'budgets');
    return { data: budget };
  }

  @Get()
  @ApiOperation({ summary: 'List all budgets for the current user' })
  async findAll(@CurrentUser('id') userId: string) {
    const budgets = await this.budgetsService.findAll(userId);
    return { data: budgets };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get budget statistics (totals, at-risk budgets)' })
  async getStats(@CurrentUser('id') userId: string) {
    const stats = await this.budgetsService.getStats(userId);
    return { data: stats };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single budget by ID' })
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const budget = await this.budgetsService.findOne(userId, id);
    return { data: budget };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a budget' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    const budget = await this.budgetsService.update(userId, id, dto);
    return { data: budget };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a budget' })
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const result = await this.budgetsService.remove(userId, id);
    return { data: result };
  }
}
