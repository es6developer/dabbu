import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccountsService } from './accounts.service';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get account stats (total balance, count, breakdown)' })
  async getStats(@CurrentUser('id') userId: string) {
    const data = await this.accountsService.getStats(userId);
    return { data };
  }
}
