import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FamilyService } from './family.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { AddMemberContactDto } from './dto/add-member-contact.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateSharedReminderDto } from './dto/create-shared-reminder.dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { JwtPayload } from '../auth/interfaces';

@ApiTags('Family')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('family')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new family group' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateFamilyDto) {
    return this.familyService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all families for current user' })
  async getUserFamilies(@CurrentUser() user: JwtPayload) {
    return this.familyService.getUserFamilies(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get family details with members' })
  async getFamily(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.familyService.getFamily(id, user.id);
  }

  @Post('members/contact')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a family member from device contact' })
  async addMemberFromContact(@CurrentUser() user: JwtPayload, @Body() dto: AddMemberContactDto) {
    return this.familyService.addMemberFromContact(user.id, dto);
  }

  @Post(':id/invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite a user to the family' })
  async inviteMember(
    @Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: InviteMemberDto,
  ) {
    return this.familyService.inviteMember(id, user.id, dto);
  }

  @Post('join/:code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join a family using invite code' })
  async joinByCode(@CurrentUser() user: JwtPayload, @Param('code') code: string) {
    return this.familyService.joinByCode(user.id, code);
  }

  @Post(':id/regenerate-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate invite code' })
  async regenerateCode(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.familyService.regenerateCode(id, user.id);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from family' })
  async removeMember(
    @Param('id') id: string, @CurrentUser() user: JwtPayload, @Param('memberId') memberId: string,
  ) {
    return this.familyService.removeMember(id, user.id, memberId);
  }

  @Patch(':id/members/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update member role' })
  async updateMemberRole(
    @Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.familyService.updateMemberRole(id, user.id, dto);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave family group' })
  async leaveFamily(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.familyService.leaveFamily(id, user.id);
  }

  // ─── Tasks ───────────────────────────────────────
  @Post(':id/tasks')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a shared task' })
  async createTask(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: CreateTaskDto) {
    return this.familyService.createTask(id, user.id, dto);
  }

  @Get(':id/tasks')
  @ApiOperation({ summary: 'Get shared tasks' })
  async getTasks(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.familyService.getTasks(id, user.id);
  }

  @Patch(':id/tasks/:taskId/status')
  @ApiOperation({ summary: 'Update task status' })
  async updateTaskStatus(
    @Param('id') id: string, @Param('taskId') taskId: string,
    @CurrentUser() user: JwtPayload, @Body('status') status: string,
  ) {
    return this.familyService.updateTaskStatus(id, taskId, user.id, status);
  }

  // ─── Reminders ────────────────────────────────────
  @Post(':id/reminders')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a shared reminder' })
  async createReminder(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: CreateSharedReminderDto) {
    return this.familyService.createReminder(id, user.id, dto);
  }

  @Get(':id/reminders')
  @ApiOperation({ summary: 'Get shared reminders' })
  async getReminders(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.familyService.getReminders(id, user.id);
  }

  // ─── Subscriptions ────────────────────────────────
  @Get(':id/subscriptions')
  @ApiOperation({ summary: 'Get shared subscriptions' })
  async getSharedSubscriptions(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.familyService.getSharedSubscriptions(id, user.id);
  }
}
