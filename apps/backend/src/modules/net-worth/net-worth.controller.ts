import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NetWorthService } from './net-worth.service';
import { UpdateNetWorthDto } from './dto/net-worth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FeatureGuard } from '../premium/guards/feature.guard';
import { RequiresPremium } from '../premium/guards/requires-premium.decorator';

@ApiTags('Net Worth')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('net-worth')
export class NetWorthController {
  constructor(private readonly netWorthService: NetWorthService) {}

  @Get()
  @ApiOperation({ summary: 'Get net worth with assets and liabilities' })
  @RequiresPremium('net_worth')
  async get(@CurrentUser('id') userId: string) {
    const result = await this.netWorthService.get(userId);
    return { data: result };
  }

  @Patch()
  @ApiOperation({ summary: 'Update net worth values' })
  @RequiresPremium('net_worth')
  async update(@CurrentUser('id') userId: string, @Body() dto: UpdateNetWorthDto) {
    const result = await this.netWorthService.update(userId, dto);
    return { data: result };
  }
}
