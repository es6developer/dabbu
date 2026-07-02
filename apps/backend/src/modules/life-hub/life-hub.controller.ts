import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../premium/guards/feature.guard';
import { RequiresPremium } from '../premium/guards/requires-premium.decorator';
import { LifeHubService } from './life-hub.service';

@ApiTags('Life Hub')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('life-hub')
export class LifeHubController {
  constructor(private readonly service: LifeHubService) {}

  @Get('house')
  @ApiOperation({ summary: 'House affordability planner' })
  @ApiQuery({ name: 'salary', type: Number })
  @ApiQuery({ name: 'location', type: String })
  @ApiQuery({ name: 'downPayment', type: Number })
  async getHousePlanner(
    @Query('salary') salary: string,
    @Query('location') location: string,
    @Query('downPayment') downPayment: string,
  ) {
    return {
      data: this.service.getHousePlanner({
        salary: Number(salary),
        location,
        downPayment: Number(downPayment),
      }),
    };
  }

  @Get('baby')
  @ApiOperation({ summary: 'Baby cost planner' })
  @ApiQuery({ name: 'monthlyIncome', type: Number })
  @ApiQuery({ name: 'currentSavings', type: Number })
  async getBabyPlanner(
    @Query('monthlyIncome') monthlyIncome: string,
    @Query('currentSavings') currentSavings: string,
  ) {
    return {
      data: this.service.getBabyPlanner({
        monthlyIncome: Number(monthlyIncome),
        currentSavings: Number(currentSavings),
      }),
    };
  }

  @Get('car')
  @ApiOperation({ summary: 'Car affordability planner' })
  @ApiQuery({ name: 'budget', type: Number })
  @ApiQuery({ name: 'loanTerm', type: Number })
  @ApiQuery({ name: 'downPayment', type: Number })
  @ApiQuery({ name: 'rate', type: Number })
  async getCarPlanner(
    @Query('budget') budget: string,
    @Query('loanTerm') loanTerm: string,
    @Query('downPayment') downPayment: string,
    @Query('rate') rate: string,
  ) {
    return {
      data: this.service.getCarPlanner({
        budget: Number(budget),
        loanTerm: Number(loanTerm),
        downPayment: Number(downPayment),
        rate: Number(rate),
      }),
    };
  }

  @Get('education')
  @ApiOperation({ summary: 'Education cost planner' })
  @ApiQuery({ name: 'courseFee', type: Number })
  @ApiQuery({ name: 'yearsUntilCollege', type: Number })
  @ApiQuery({ name: 'monthlySaving', type: Number })
  async getEducationPlanner(
    @Query('courseFee') courseFee: string,
    @Query('yearsUntilCollege') yearsUntilCollege: string,
    @Query('monthlySaving') monthlySaving: string,
  ) {
    return {
      data: this.service.getEducationPlanner({
        courseFee: Number(courseFee),
        yearsUntilCollege: Number(yearsUntilCollege),
        monthlySaving: Number(monthlySaving),
      }),
    };
  }

  @Get('vacation')
  @ApiOperation({ summary: 'Vacation savings planner' })
  @ApiQuery({ name: 'destination', type: String })
  @ApiQuery({ name: 'budget', type: Number })
  @ApiQuery({ name: 'monthsUntilTrip', type: Number })
  @ApiQuery({ name: 'savedSoFar', type: Number })
  async getVacationPlanner(
    @Query('destination') destination: string,
    @Query('budget') budget: string,
    @Query('monthsUntilTrip') monthsUntilTrip: string,
    @Query('savedSoFar') savedSoFar: string,
  ) {
    return {
      data: this.service.getVacationPlanner({
        destination,
        budget: Number(budget),
        monthsUntilTrip: Number(monthsUntilTrip),
        savedSoFar: Number(savedSoFar),
      }),
    };
  }

  @Get('wedding')
  @ApiOperation({ summary: 'Wedding budget planner' })
  @ApiQuery({ name: 'guestCount', type: Number })
  @ApiQuery({ name: 'budget', type: Number })
  @ApiQuery({ name: 'monthsUntilWedding', type: Number })
  async getWeddingPlanner(
    @Query('guestCount') guestCount: string,
    @Query('budget') budget: string,
    @Query('monthsUntilWedding') monthsUntilWedding: string,
  ) {
    return {
      data: this.service.getWeddingPlanner({
        guestCount: Number(guestCount),
        budget: Number(budget),
        monthsUntilWedding: Number(monthsUntilWedding),
      }),
    };
  }

  @Get('investment')
  @UseGuards(FeatureGuard)
  @RequiresPremium('investment_tracker')
  @ApiOperation({ summary: 'Investment planner' })
  @ApiQuery({ name: 'age', type: Number })
  @ApiQuery({ name: 'monthlyIncome', type: Number })
  @ApiQuery({ name: 'currentSavings', type: Number })
  @ApiQuery({ name: 'riskProfile', type: String })
  async getInvestmentPlanner(
    @Query('age') age: string,
    @Query('monthlyIncome') monthlyIncome: string,
    @Query('currentSavings') currentSavings: string,
    @Query('riskProfile') riskProfile: string,
  ) {
    return {
      data: this.service.getInvestmentPlanner({
        age: Number(age),
        monthlyIncome: Number(monthlyIncome),
        currentSavings: Number(currentSavings),
        riskProfile,
      }),
    };
  }

  @Get('retirement')
  @UseGuards(FeatureGuard)
  @RequiresPremium('investment_tracker')
  @ApiOperation({ summary: 'Retirement planner' })
  @ApiQuery({ name: 'age', type: Number })
  @ApiQuery({ name: 'monthlyExpense', type: Number })
  @ApiQuery({ name: 'currentSavings', type: Number })
  async getRetirementPlanner(
    @Query('age') age: string,
    @Query('monthlyExpense') monthlyExpense: string,
    @Query('currentSavings') currentSavings: string,
  ) {
    return {
      data: this.service.getRetirementPlanner({
        age: Number(age),
        monthlyExpense: Number(monthlyExpense),
        currentSavings: Number(currentSavings),
      }),
    };
  }
}
