import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'List all accounts for the current user' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'includeArchived', required: false })
  async list(
    @CurrentUser('id') userId: string,
    @Query('type') type?: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    const data = await this.accountsService.list(userId, type, includeArchived === 'true');
    return { data };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get account stats (total balance, count, breakdown)' })
  async getStats(@CurrentUser('id') userId: string) {
    const data = await this.accountsService.getStats(userId);
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account by ID' })
  async getById(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const data = await this.accountsService.getById(id, userId);
    return { data };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new account' })
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateAccountDto) {
    const data = await this.accountsService.create(userId, dto);
    return { data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an account' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateAccountDto,
  ) {
    const data = await this.accountsService.update(id, userId, dto);
    return { data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete an account' })
  async remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.accountsService.remove(id, userId);
    return { success: true };
  }
}
