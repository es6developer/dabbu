import {
  Controller, Get, Post, Patch, Body, Param,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettlementsService } from './settlements.service';
import { CreateSettlementDto, UpdateSettlementDto } from './dto/expenses.dto';
import { DualAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Shared Finance - Settlements')
@ApiBearerAuth()
@UseGuards(DualAuthGuard)
@Controller('shared-finance/groups/:groupId/settlements')
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Get()
  @ApiOperation({ summary: 'List settlements' })
  async findAll(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
  ) {
    return this.settlementsService.findAll(groupId, user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create settlement' })
  async create(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateSettlementDto,
  ) {
    return this.settlementsService.create(groupId, user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update settlement status' })
  async updateStatus(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateSettlementDto,
  ) {
    return this.settlementsService.updateStatus(groupId, id, user.id, dto);
  }

  @Get('optimize')
  @ApiOperation({ summary: 'Get debt simplification graph' })
  async getOptimizedDebts(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
  ) {
    return this.settlementsService.getOptimizedDebts(groupId, user.id);
  }

  @Get('simplify')
  @ApiOperation({ summary: 'Get optimized settlement suggestions' })
  async getSimplifiedSettlements(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
  ) {
    return this.settlementsService.getSimplifiedSettlements(groupId, user.id);
  }
}
