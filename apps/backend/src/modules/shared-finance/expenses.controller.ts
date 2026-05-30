import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import {
  CreateExpenseDto, UpdateExpenseDto, CreateCommentDto, CreateAttachmentDto,
} from './dto/expenses.dto';
import { DualAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Shared Finance - Expenses')
@ApiBearerAuth()
@UseGuards(DualAuthGuard)
@Controller('shared-finance/groups/:groupId/expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create expense with splits' })
  async create(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expensesService.create(groupId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List group expenses' })
  async findAll(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
    @Query('category') category?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.expensesService.findAll(groupId, user.id, {
      category,
      fromDate,
      toDate,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Expense detail' })
  async findOne(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.expensesService.findOne(groupId, id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update expense' })
  async update(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(groupId, id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete expense' })
  async delete(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.expensesService.delete(groupId, id, user.id);
  }

  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add comment to expense' })
  async addComment(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateCommentDto,
  ) {
    return this.expensesService.addComment(groupId, id, user.id, dto.content);
  }

  @Post(':id/attachments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add attachment to expense' })
  async addAttachment(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateAttachmentDto,
  ) {
    return this.expensesService.addAttachment(groupId, id, user.id, dto.type, dto.url);
  }

  @Get('analytics/categories')
  @ApiOperation({ summary: 'Get category-based analytics' })
  async getCategoryAnalytics(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.expensesService.getCategoryAnalytics(groupId, user.id, fromDate, toDate);
  }
}
