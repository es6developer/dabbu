import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IncomesService } from './incomes.service';
import { CreateIncomeDto, UpdateIncomeDto } from './dto/income.dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Shared Finance - Income')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shared-finance/groups/:groupId/incomes')
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add income to group' })
  async create(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateIncomeDto,
  ) {
    return this.incomesService.create(groupId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all income entries for the group' })
  async findAll(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
  ) {
    return this.incomesService.findAll(groupId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single income entry' })
  async findOne(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.incomesService.findOne(groupId, id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an income entry' })
  async update(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateIncomeDto,
  ) {
    return this.incomesService.update(groupId, id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an income entry' })
  async delete(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.incomesService.delete(groupId, id, user.id);
  }
}
