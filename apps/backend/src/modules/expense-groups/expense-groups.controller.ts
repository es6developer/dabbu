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
import { CreateExpenseGroupDto, UpdateExpenseGroupDto, AddMemberDto } from './expense-groups.dto';
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
}
