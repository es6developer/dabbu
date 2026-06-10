import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ForecastService } from './forecast.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PremiumGuard } from '../premium/guards/premium.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Forecast')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('forecast')
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  @Get('cashflow')
  @ApiOperation({ summary: 'Cash flow forecast for next N months' })
  @ApiQuery({ name: 'months', required: false })
  async cashFlowForecast(@CurrentUser('id') userId: string, @Query('months') months?: string) {
    const result = await this.forecastService.cashFlowForecast(
      userId,
      months ? parseInt(months) : 3,
    );
    return { data: result };
  }

  @Get('savings')
  @UseGuards(PremiumGuard)
  @ApiOperation({ summary: 'Savings growth forecast (premium)' })
  @ApiQuery({ name: 'monthlySavings', required: false })
  @ApiQuery({ name: 'months', required: false })
  async savingsForecast(
    @CurrentUser('id') userId: string,
    @Query('monthlySavings') monthlySavings?: string,
    @Query('months') months?: string,
  ) {
    const result = await this.forecastService.savingsForecast(
      userId,
      monthlySavings ? parseInt(monthlySavings) : undefined,
      months ? parseInt(months) : 12,
    );
    return { data: result };
  }

  @Get('loan-payoff')
  @UseGuards(PremiumGuard)
  @ApiOperation({ summary: 'Loan payoff forecast with amortization schedule (premium)' })
  @ApiQuery({ name: 'loanId', required: false })
  @ApiQuery({ name: 'extraPayment', required: false })
  async loanPayoffForecast(
    @CurrentUser('id') userId: string,
    @Query('loanId') loanId?: string,
    @Query('extraPayment') extraPayment?: string,
  ) {
    const result = await this.forecastService.loanPayoffForecast(
      userId,
      loanId,
      extraPayment ? parseInt(extraPayment) : 0,
    );
    return { data: result };
  }
}
