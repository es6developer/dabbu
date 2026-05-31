import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrencyService } from './currency.service';
import { CurrentUser, Public } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Currencies')
@Controller('currencies')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all supported currencies' })
  async findAll() {
    return this.currencyService.findAll();
  }

  @Get('detect')
  @Public()
  @ApiOperation({ summary: 'Detect currency by IP geolocation' })
  async detect(@Req() req: any) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '8.8.8.8';
    return this.currencyService.detectByIp(ip);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('users/me')
  @ApiOperation({ summary: 'Update user preferred currency' })
  async updateMyCurrency(
    @CurrentUser('id') userId: string,
    @Body('currency') currencyCode: string,
  ) {
    return this.currencyService.updateUserCurrency(userId, currencyCode);
  }
}
