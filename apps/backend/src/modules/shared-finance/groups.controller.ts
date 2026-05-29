import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import {
  CreateGroupDto, UpdateGroupDto, JoinGroupDto,
  UpdateMemberRoleDto, SalaryProfileDto, AddMemberByEmailDto,
} from './groups.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Shared Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shared-finance/groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a shared finance group' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all groups for the current user' })
  async findAll(@CurrentUser('id') userId: string) {
    return this.groupsService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group details with members and balances' })
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.groupsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update group settings' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive/delete a group' })
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.groupsService.remove(id, userId);
  }

  @Post(':id/invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a new invite code for the group' })
  async generateInviteCode(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.groupsService.generateInviteCode(id, userId);
  }

  @Post(':id/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join a group using an invite code' })
  async joinByCode(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: JoinGroupDto,
  ) {
    return this.groupsService.joinByCode(userId, id, dto.inviteCode);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave a group' })
  async leave(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.groupsService.leave(id, userId);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from the group' })
  async removeMember(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.groupsService.removeMember(id, userId, memberId);
  }

  @Patch(':id/members/:memberId/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a member role' })
  async updateMemberRole(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.groupsService.updateMemberRole(id, userId, memberId, dto);
  }

  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Get group dashboard with aggregated data' })
  async getDashboard(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.groupsService.getDashboard(id, userId);
  }

  @Post(':id/members/email')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a member to the group by email (no approval needed)' })
  async addMemberByEmail(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: AddMemberByEmailDto,
  ) {
    return this.groupsService.addMemberByEmail(id, userId, dto);
  }

  @Post(':id/profile')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add or update salary profile for the group' })
  async upsertSalaryProfile(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: SalaryProfileDto,
  ) {
    return this.groupsService.upsertSalaryProfile(userId, id, dto);
  }
}
