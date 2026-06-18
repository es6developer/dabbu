import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiFamilyAdvisorService } from './ai-family-advisor.service';

@ApiTags('AI Family Advisor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/family-advisor')
export class AiFamilyAdvisorController {
  constructor(private readonly service: AiFamilyAdvisorService) {}

  @Get('review')
  @ApiOperation({ summary: 'Generate family spending review' })
  async getReview(@CurrentUser('id') userId: string) {
    return { data: await this.service.generateFamilySpendingReview(userId) };
  }

  @Get('savings')
  @ApiOperation({ summary: 'Generate savings recommendations' })
  async getSavings(@CurrentUser('id') userId: string) {
    return { data: await this.service.generateSavingsRecommendations(userId) };
  }

  @Get('insurance')
  @ApiOperation({ summary: 'Generate insurance suggestions' })
  async getInsurance(@CurrentUser('id') userId: string) {
    return { data: await this.service.generateInsuranceSuggestions(userId) };
  }

  @Get('investments')
  @ApiOperation({ summary: 'Generate investment suggestions' })
  async getInvestments(@CurrentUser('id') userId: string) {
    return { data: await this.service.generateInvestmentSuggestions(userId) };
  }

  @Get('forecasts')
  @ApiOperation({ summary: 'Generate goal forecasts' })
  async getForecasts(@CurrentUser('id') userId: string) {
    return { data: await this.service.generateGoalForecasts(userId) };
  }

  @Get('risk')
  @ApiOperation({ summary: 'Detect financial risks' })
  async getRisk(@CurrentUser('id') userId: string) {
    return { data: await this.service.generateRiskDetection(userId) };
  }
}
