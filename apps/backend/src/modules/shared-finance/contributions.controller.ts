import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContributionsService } from './contributions.service';
import {
  CreateContributionRuleDto, UpdateContributionRuleDto,
  CalculateContributionDto, ApplyContributionDto,
} from './dto/contributions.dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Shared Finance - Contributions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shared-finance/groups/:groupId/contributions')
export class ContributionsController {
  constructor(private readonly contributionsService: ContributionsService) {}

  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create contribution rule' })
  async createRule(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateContributionRuleDto,
  ) {
    return this.contributionsService.createRule(groupId, user.id, dto);
  }

  @Get('rules')
  @ApiOperation({ summary: 'List contribution rules' })
  async listRules(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
  ) {
    return this.contributionsService.listRules(groupId, user.id);
  }

  @Patch('rules/:id')
  @ApiOperation({ summary: 'Update contribution rule' })
  async updateRule(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateContributionRuleDto,
  ) {
    return this.contributionsService.updateRule(groupId, id, user.id, dto);
  }

  @Delete('rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete contribution rule' })
  async deleteRule(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.contributionsService.deleteRule(groupId, id, user.id);
  }

  @Get('salary-profiles')
  @ApiOperation({ summary: 'List salary profiles in group' })
  async getSalaryProfiles(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
  ) {
    return this.contributionsService.getSalaryProfiles(groupId, user.id);
  }

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate recommended contributions' })
  async calculate(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
    @Body() dto: CalculateContributionDto,
  ) {
    return this.contributionsService.calculateContributions(
      groupId, user.id, dto.ruleId, dto.totalAmount,
    );
  }

  @Post('apply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Apply contribution rule to create expenses' })
  async apply(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
    @Body() dto: ApplyContributionDto,
  ) {
    return this.contributionsService.applyRule(
      groupId, user.id, dto.ruleId, dto.description, dto.category, dto.date,
    );
  }

  @Get('fairness')
  @ApiOperation({ summary: 'Get fairness analysis with adjustment suggestions' })
  async fairness(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
  ) {
    return this.contributionsService.fairnessEngine(groupId, user.id);
  }
}
