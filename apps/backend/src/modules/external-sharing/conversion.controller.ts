import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConversionService } from './conversion.service';
import { ConversionEvaluateDto } from './dto/conversion-evaluate.dto';
import { ConversionActionDto } from './dto/conversion-action.dto';
import { MergeAccountDto } from './dto/merge-account.dto';
import { OnboardingEventDto } from './dto/onboarding-event.dto';

@ApiTags('External Sharing - Conversion')
@Controller('external-sharing/conversion')
export class ConversionController {
  constructor(private readonly conversionService: ConversionService) {}

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate temp user for conversion triggers' })
  async evaluate(@Body() dto: ConversionEvaluateDto) {
    const result = await this.conversionService.evaluate(dto.tempUserId);
    return { data: result };
  }

  @Get('triggers/:tempUserId')
  @ApiOperation({ summary: 'Get active triggers for a temp user' })
  async getActiveTriggers(@Param('tempUserId') tempUserId: string) {
    const result = await this.conversionService.getActiveTriggers(tempUserId);
    return { data: result };
  }

  @Post('action')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log conversion action' })
  async logAction(@Body() dto: ConversionActionDto) {
    const result = await this.conversionService.logAction(dto.tempUserId, dto.eventType, dto.response, dto.metadata);
    return { data: result };
  }

  @Get('banners/:tempUserId')
  @ApiOperation({ summary: 'Get personalized banners for a temp user' })
  async getPersonalizedBanners(@Param('tempUserId') tempUserId: string) {
    const result = await this.conversionService.getPersonalizedBanners(tempUserId);
    return { data: result };
  }

  @Post('onboarding')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Log onboarding event' })
  async logOnboardingEvent(@Body() dto: OnboardingEventDto) {
    const result = await this.conversionService.logOnboardingEvent(
      dto.tempUserId, dto.eventType, dto.source, dto.metadata,
    );
    return { data: result };
  }

  @Post('merge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Merge temp account to full user account' })
  async mergeAccount(@Body() dto: MergeAccountDto) {
    const result = await this.conversionService.mergeAccount(dto.tempUserId, dto.fullUserId);
    return { data: result };
  }
}
