import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BillRemindersService } from './bill-reminders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateBillReminderDto } from './dto/create-bill-reminder.dto';
import { UpdateBillReminderDto } from './dto/update-bill-reminder.dto';

@ApiTags('Bill Reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bill-reminders')
export class BillRemindersController {
  constructor(private readonly billRemindersService: BillRemindersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new bill reminder' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateBillReminderDto) {
    const bill = await this.billRemindersService.create(userId, dto);
    return { data: bill };
  }

  @Get()
  @ApiOperation({ summary: 'List all bill reminders' })
  async findAll(@CurrentUser('id') userId: string) {
    const bills = await this.billRemindersService.findAll(userId);
    return { data: bills };
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming bills within N days' })
  async getUpcoming(@CurrentUser('id') userId: string, @Query('days') days?: string) {
    const bills = await this.billRemindersService.getUpcoming(userId, days ? parseInt(days) : 7);
    return { data: bills };
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue bills' })
  async getOverdue(@CurrentUser('id') userId: string) {
    const bills = await this.billRemindersService.getOverdue(userId);
    return { data: bills };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a bill reminder by ID' })
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const bill = await this.billRemindersService.findOne(userId, id);
    return { data: bill };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a bill reminder' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBillReminderDto,
  ) {
    const bill = await this.billRemindersService.update(userId, id, dto);
    return { data: bill };
  }

  @Post(':id/paid')
  @ApiOperation({ summary: 'Mark a bill as paid (optionally with partial amount)' })
  async markPaid(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body('paidAmount') paidAmount?: number,
  ) {
    const bill = await this.billRemindersService.markPaid(userId, id, paidAmount);
    return { data: bill };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a bill reminder' })
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const result = await this.billRemindersService.remove(userId, id);
    return { data: result };
  }
}
