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
import { ExpenseGroupsService } from './expense-groups.service';
import {
  CreateExpenseGroupDto,
  UpdateExpenseGroupDto,
  AddMemberDto,
  AddMemberByPhoneDto,
  AddMemberByUserIdDto,
  UpdateMemberRoleDto,
} from './expense-groups.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Expense Groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expense-groups')
export class ExpenseGroupsController {
  constructor(private readonly expenseGroupsService: ExpenseGroupsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an expense group' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateExpenseGroupDto) {
    return this.expenseGroupsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my expense groups' })
  async findAll(@CurrentUser('id') userId: string) {
    return this.expenseGroupsService.findAll(userId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get expense groups with recent transactions (dashboard use)' })
  async findDashboard(@CurrentUser('id') userId: string) {
    return this.expenseGroupsService.findDashboard(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get expense group details' })
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.expenseGroupsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update expense group' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseGroupDto,
  ) {
    return this.expenseGroupsService.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete expense group' })
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.expenseGroupsService.remove(id, userId);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add member to expense group' })
  async addMember(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.expenseGroupsService.addMember(id, userId, dto);
  }

  @Post(':id/members/add-by-user-id')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add member to expense group by user id' })
  async addMemberByUserId(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: AddMemberByUserIdDto,
  ) {
    return this.expenseGroupsService.addMemberByUserId(id, userId, dto.userId);
  }

  @Post(':id/members/add-by-phone')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add member to expense group by phone number' })
  async addMemberByPhone(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: AddMemberByPhoneDto,
  ) {
    return this.expenseGroupsService.addMemberByPhone(id, userId, dto.phone);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove member from expense group' })
  async removeMember(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.expenseGroupsService.removeMember(id, userId, memberId);
  }

  @Patch(':id/members/:memberId/role')
  @ApiOperation({ summary: 'Change expense group member role' })
  async updateMemberRole(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.expenseGroupsService.updateMemberRole(id, userId, memberId, dto.role);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave expense group' })
  async leave(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.expenseGroupsService.leave(id, userId);
  }
}
