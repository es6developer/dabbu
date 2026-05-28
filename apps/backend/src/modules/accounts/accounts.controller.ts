import {
  Controller, Get, Patch, Delete, Body, Param, UseGuards, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all accounts' })
  async getAccounts(@CurrentUser('id') userId: string) {
    const accounts = await this.accountsService.getAccounts(userId);
    return { data: accounts };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get account statistics' })
  async getStats(@CurrentUser('id') userId: string) {
    const stats = await this.accountsService.getAccountStats(userId);
    return { data: stats };
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get AI spending insights' })
  async getInsights(@CurrentUser('id') userId: string) {
    const insights = await this.accountsService.getInsights(userId);
    return { data: insights };
  }

  @Get('recurring')
  @ApiOperation({ summary: 'Get detected recurring payment patterns' })
  async getRecurringPatterns(@CurrentUser('id') userId: string) {
    const patterns = await this.accountsService.getRecurringPatterns(userId);
    return { data: patterns };
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get monthly income/expense trends' })
  async getMonthlyTrends(
    @CurrentUser('id') userId: string,
    @Query('months') months?: number,
  ) {
    const trends = await this.accountsService.getMonthlyTrends(userId, months || 6);
    return { data: trends };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account details with recent transactions' })
  async getAccount(@CurrentUser('id') userId: string, @Param('id') accountId: string) {
    const account = await this.accountsService.getAccount(userId, accountId);
    return { data: account };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update account details' })
  async updateAccount(
    @CurrentUser('id') userId: string,
    @Param('id') accountId: string,
    @Body() dto: { name?: string; type?: string; currency?: string; isActive?: boolean },
  ) {
    const account = await this.accountsService.updateAccount(userId, accountId, dto);
    return { data: account };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an account' })
  async deleteAccount(@CurrentUser('id') userId: string, @Param('id') accountId: string) {
    const result = await this.accountsService.deleteAccount(userId, accountId);
    return { data: result };
  }
}
