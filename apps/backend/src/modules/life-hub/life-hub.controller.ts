import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
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

  @Get('retirement')
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
