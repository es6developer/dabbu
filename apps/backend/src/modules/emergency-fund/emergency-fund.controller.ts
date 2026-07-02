import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FeatureGuard } from '../premium/guards/feature.guard';
import { RequiresPremium } from '../premium/guards/requires-premium.decorator';
import { EmergencyFundService } from './emergency-fund.service';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class UpdateEmergencyFundDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  savedAmount?: number;
}

@ApiTags('Emergency Fund')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('emergency-fund')
export class EmergencyFundController {
  constructor(private readonly service: EmergencyFundService) {}

  @Get()
  @UseGuards(FeatureGuard)
  @RequiresPremium('emergency_fund_tracker')
  @ApiOperation({ summary: 'Get personal emergency fund status' })
  async get(@CurrentUser('id') userId: string) {
    return { data: await this.service.get(userId) };
  }

  @Patch()
  @UseGuards(FeatureGuard)
  @RequiresPremium('emergency_fund_tracker')
  @ApiOperation({ summary: 'Update emergency fund saved amount' })
  async update(@CurrentUser('id') userId: string, @Body() dto: UpdateEmergencyFundDto) {
    return { data: await this.service.update(userId, dto.savedAmount) };
  }
}
