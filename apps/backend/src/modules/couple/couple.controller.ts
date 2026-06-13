import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsBoolean, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CoupleService } from './couple.service';
import { CouplePlannerService } from './couple-planner.service';
import { CoupleTimelineService } from './couple-timeline.service';
import { CoupleGamificationService } from './couple-gamification.service';
import { CoupleDashboardService } from './couple-dashboard.service';

class SendRequestDto {
  @IsString() @IsNotEmpty() phone: string;
}

class ToggleModeDto {
  @IsBoolean() @IsNotEmpty() isCoupleMode: boolean;
}

class BabyPlannerDto {
  @IsString() @IsNotEmpty() timeline: string;
  @IsNumber() @Min(0) @Transform(({ value }) => Number(value)) currentSavings: number;
  @IsNumber() @Min(0) @Transform(({ value }) => Number(value)) monthlyIncome: number;
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => Number(value))
  existingLoanEmi?: number;
  @IsString() @IsOptional() hospitalType?: string;
}

class HousePlannerDto {
  @IsNumber() @Min(0) @Transform(({ value }) => Number(value)) propertyPrice: number;
  @IsNumber() @Min(0) @Transform(({ value }) => Number(value)) downPayment: number;
  @IsNumber() @Min(0) @Transform(({ value }) => Number(value)) interestRate: number;
  @IsNumber() @Min(1) @Transform(({ value }) => Number(value)) loanTenure: number;
  @IsNumber() @Min(0) @Transform(({ value }) => Number(value)) monthlyIncome: number;
  @IsNumber() @Min(0) @IsOptional() @Transform(({ value }) => Number(value)) existingEmi?: number;
}

class CarPlannerDto {
  @IsNumber() @Min(0) @Transform(({ value }) => Number(value)) carPrice: number;
  @IsNumber() @Min(0) @Transform(({ value }) => Number(value)) downPayment: number;
  @IsNumber() @Min(0) @Transform(({ value }) => Number(value)) interestRate: number;
  @IsNumber() @Min(1) @Transform(({ value }) => Number(value)) loanTenure: number;
  @IsNumber() @Min(0) @Transform(({ value }) => Number(value)) monthlyIncome: number;
  @IsNumber() @Min(0) @IsOptional() @Transform(({ value }) => Number(value)) existingEmi?: number;
}

class RetirementPlannerDto {
  @IsNumber() @Min(0) @Transform(({ value }) => Number(value)) currentAge: number;
  @IsNumber() @Min(0) @Transform(({ value }) => Number(value)) retirementAge: number;
  @IsNumber() @Min(0) @Transform(({ value }) => Number(value)) monthlyExpense: number;
  @IsNumber() @Min(0) @IsOptional() @Transform(({ value }) => Number(value)) currentCorpus?: number;
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => Number(value))
  monthlySavings?: number;
  @IsNumber() @Min(0) @IsOptional() @Transform(({ value }) => Number(value)) inflationRate?: number;
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => Number(value))
  expectedReturns?: number;
}

@ApiTags('Couple')
@Controller('couple')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CoupleController {
  constructor(
    private readonly coupleService: CoupleService,
    private readonly plannerService: CouplePlannerService,
    private readonly timelineService: CoupleTimelineService,
    private readonly gamificationService: CoupleGamificationService,
    private readonly dashboardService: CoupleDashboardService,
  ) {}

  // ─── Existing endpoints ─────────────────────────────────

  @Post('send-request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a couple request by phone number' })
  async sendRequest(@CurrentUser('id') userId: string, @Body() dto: SendRequestDto) {
    return this.coupleService.sendRequest(userId, dto.phone);
  }

  @Post('approve-request/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending couple request' })
  async approveRequest(@CurrentUser('id') userId: string, @Param('id') requestId: string) {
    return this.coupleService.approveRequest(userId, requestId);
  }

  @Post('reject-request/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending couple request' })
  async rejectRequest(@CurrentUser('id') userId: string, @Param('id') requestId: string) {
    return this.coupleService.rejectRequest(userId, requestId);
  }

  @Post('cancel-request/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a sent couple request' })
  async cancelRequest(@CurrentUser('id') userId: string, @Param('id') requestId: string) {
    return this.coupleService.cancelRequest(userId, requestId);
  }

  @Get('requests')
  @ApiOperation({ summary: 'List sent and received couple requests' })
  async listRequests(@CurrentUser('id') userId: string) {
    return this.coupleService.listRequests(userId);
  }

  @Post('toggle-mode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle couple mode on/off for current user' })
  async toggleMode(@CurrentUser('id') userId: string, @Body() dto: ToggleModeDto) {
    return this.coupleService.toggleMode(userId, dto.isCoupleMode);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current couple status with partner info' })
  async getStatus(@CurrentUser('id') userId: string) {
    return this.coupleService.getStatus(userId);
  }

  @Post('remove-partner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove partner and break couple relationship' })
  async removePartner(@CurrentUser('id') userId: string) {
    return this.coupleService.removePartner(userId);
  }

  // ─── Dashboard ───────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Get couple financial GPS dashboard' })
  async getDashboard(@CurrentUser('id') userId: string) {
    return this.dashboardService.getDashboard(userId);
  }

  // ─── Financial Planners ──────────────────────────────────

  @Get('planners')
  @ApiOperation({ summary: 'List all planners for couple' })
  async getPlanners(@CurrentUser('id') userId: string) {
    const group = await this.coupleService.findCoupleGroup(userId);
    return this.plannerService.getPlanners(group.id);
  }

  @Get('planners/:type')
  @ApiOperation({ summary: 'Get a specific planner' })
  async getPlanner(@CurrentUser('id') userId: string, @Param('type') type: string) {
    const group = await this.coupleService.findCoupleGroup(userId);
    return this.plannerService.getPlanner(group.id, type.toUpperCase());
  }

  @Post('planners/baby')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create/update baby planner' })
  async babyPlanner(@CurrentUser('id') userId: string, @Body() dto: BabyPlannerDto) {
    const group = await this.coupleService.findCoupleGroup(userId);
    return this.plannerService.babyPlanner(group.id, userId, {
      timeline: dto.timeline as any,
      currentSavings: dto.currentSavings,
      monthlyIncome: dto.monthlyIncome,
      existingLoanEmi: dto.existingLoanEmi || 0,
      hospitalType: (dto.hospitalType || 'private') as any,
    });
  }

  @Post('planners/house')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create/update house planner' })
  async housePlanner(@CurrentUser('id') userId: string, @Body() dto: HousePlannerDto) {
    const group = await this.coupleService.findCoupleGroup(userId);
    return this.plannerService.housePlanner(group.id, {
      propertyPrice: dto.propertyPrice,
      downPayment: dto.downPayment,
      interestRate: dto.interestRate,
      loanTenure: dto.loanTenure,
      monthlyIncome: dto.monthlyIncome,
      existingEmi: dto.existingEmi || 0,
    });
  }

  @Post('planners/car')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create/update car planner' })
  async carPlanner(@CurrentUser('id') userId: string, @Body() dto: CarPlannerDto) {
    const group = await this.coupleService.findCoupleGroup(userId);
    return this.plannerService.carPlanner(group.id, {
      carPrice: dto.carPrice,
      downPayment: dto.downPayment,
      interestRate: dto.interestRate,
      loanTenure: dto.loanTenure,
      monthlyIncome: dto.monthlyIncome,
      existingEmi: dto.existingEmi || 0,
    });
  }

  @Post('planners/retirement')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create/update retirement planner' })
  async retirementPlanner(@CurrentUser('id') userId: string, @Body() dto: RetirementPlannerDto) {
    const group = await this.coupleService.findCoupleGroup(userId);
    return this.plannerService.retirementPlanner(group.id, {
      currentAge: dto.currentAge,
      retirementAge: dto.retirementAge,
      monthlyExpense: dto.monthlyExpense,
      currentCorpus: dto.currentCorpus || 0,
      monthlySavings: dto.monthlySavings || 0,
      inflationRate: dto.inflationRate || 6,
      expectedReturns: dto.expectedReturns || 10,
    });
  }

  @Delete('planners/:type')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a planner' })
  async deletePlanner(@CurrentUser('id') userId: string, @Param('type') type: string) {
    const group = await this.coupleService.findCoupleGroup(userId);
    return this.plannerService.deletePlanner(group.id, type.toUpperCase());
  }

  // ─── Timeline ────────────────────────────────────────────

  @Get('timeline')
  @ApiOperation({ summary: 'Get couple timeline feed' })
  async getTimeline(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const group = await this.coupleService.findCoupleGroup(userId);
    return this.timelineService.getTimeline(group.id, Number(page) || 1, Number(limit) || 20);
  }

  // ─── Gamification ────────────────────────────────────────

  @Get('gamification')
  @ApiOperation({ summary: 'Get couple gamification status' })
  async getGamification(@CurrentUser('id') userId: string) {
    const group = await this.coupleService.findCoupleGroup(userId);
    return this.gamificationService.getGamification(group.id);
  }
}
