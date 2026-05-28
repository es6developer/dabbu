import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReminderService } from './reminder.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateReminderDto,
  UpdateReminderDto,
  ListRemindersQueryDto,
  SnoozeReminderDto,
} from './dto';

@ApiTags('Reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reminders')
export class ReminderController {
  constructor(private readonly reminderService: ReminderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new reminder' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateReminderDto) {
    const reminder = await this.reminderService.create(userId, dto);
    return { data: reminder };
  }

  @Get()
  @ApiOperation({ summary: 'List reminders with filters' })
  async findAll(@CurrentUser('id') userId: string, @Query() query: ListRemindersQueryDto) {
    return this.reminderService.findAll(userId, query);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming reminders within N days' })
  async getUpcoming(
    @CurrentUser('id') userId: string,
    @Query('days') days?: number,
  ) {
    const reminders = await this.reminderService.getUpcoming(userId, days || 7);
    return { data: reminders };
  }

  @Get('today')
  @ApiOperation({ summary: "Get today's reminders" })
  async getToday(@CurrentUser('id') userId: string) {
    const reminders = await this.reminderService.getTodayReminders(userId);
    return { data: reminders };
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue reminders' })
  async getOverdue(@CurrentUser('id') userId: string) {
    const reminders = await this.reminderService.getOverdue(userId);
    return { data: reminders };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a reminder by ID' })
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const reminder = await this.reminderService.findOne(userId, id);
    return { data: reminder };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a reminder' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReminderDto,
  ) {
    const reminder = await this.reminderService.update(userId, id, dto);
    return { data: reminder };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a reminder' })
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.reminderService.remove(userId, id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark reminder as completed' })
  async complete(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const reminder = await this.reminderService.complete(userId, id);
    return { data: reminder };
  }

  @Post(':id/snooze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Snooze a reminder' })
  async snooze(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: SnoozeReminderDto,
  ) {
    const reminder = await this.reminderService.snooze(userId, id, dto.until);
    return { data: reminder };
  }
}
