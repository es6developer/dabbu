import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FamilySpaceService } from './family-space.service';
import { CreateFamilyGoalDto, UpdateFamilyGoalDto } from './dto/create-family-goal.dto';
import { CreateFamilyBillDto, UpdateFamilyBillDto } from './dto/create-family-bill.dto';
import {
  CreateFamilyContributionDto,
  UpdateFamilyContributionDto,
} from './dto/create-family-contribution.dto';
import {
  CreateFamilyInvestmentDto,
  UpdateFamilyInvestmentDto,
} from './dto/create-family-investment.dto';
import { CreateFamilyDocumentDto } from './dto/create-family-document.dto';
import {
  CreateFamilyCalendarEventDto,
  UpdateFamilyCalendarEventDto,
} from './dto/create-family-calendar.dto';
import { CreateFamilyTaskDto, UpdateFamilyTaskDto } from './dto/create-family-task.dto';

@ApiTags('Family Space')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('family-space')
export class FamilySpaceController {
  constructor(private readonly service: FamilySpaceService) {}

  @Get()
  @ApiOperation({ summary: 'Get family space dashboard overview' })
  async getDashboard(@CurrentUser('id') userId: string) {
    return { data: await this.service.getDashboard(userId) };
  }

  @Get('members')
  @ApiOperation({ summary: 'Get family members' })
  async getMembers(@CurrentUser('id') userId: string) {
    return { data: await this.service.getMembers(userId) };
  }

  @Get('goals')
  @ApiOperation({ summary: 'Get family goals' })
  async getGoals(@CurrentUser('id') userId: string) {
    return { data: await this.service.getGoals(userId) };
  }

  @Post('goals')
  @ApiOperation({ summary: 'Create a family goal' })
  async createGoal(@CurrentUser('id') userId: string, @Body() dto: CreateFamilyGoalDto) {
    return { data: await this.service.createGoal(userId, dto) };
  }

  @Put('goals/:id')
  @ApiOperation({ summary: 'Update a family goal' })
  async updateGoal(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFamilyGoalDto,
  ) {
    return { data: await this.service.updateGoal(userId, id, dto) };
  }

  @Delete('goals/:id')
  @ApiOperation({ summary: 'Delete a family goal' })
  async deleteGoal(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return { data: await this.service.deleteGoal(userId, id) };
  }

  @Get('bills')
  @ApiOperation({ summary: 'Get family bills' })
  async getBills(@CurrentUser('id') userId: string) {
    return { data: await this.service.getBills(userId) };
  }

  @Post('bills')
  @ApiOperation({ summary: 'Create a family bill' })
  async createBill(@CurrentUser('id') userId: string, @Body() dto: CreateFamilyBillDto) {
    return { data: await this.service.createBill(userId, dto) };
  }

  @Put('bills/:id')
  @ApiOperation({ summary: 'Update a family bill' })
  async updateBill(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFamilyBillDto,
  ) {
    return { data: await this.service.updateBill(userId, id, dto) };
  }

  @Delete('bills/:id')
  @ApiOperation({ summary: 'Delete a family bill' })
  async deleteBill(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return { data: await this.service.deleteBill(userId, id) };
  }

  @Get('contributions')
  @ApiOperation({ summary: 'Get member contributions' })
  async getContributions(@CurrentUser('id') userId: string) {
    return { data: await this.service.getContributions(userId) };
  }

  @Post('contributions')
  @ApiOperation({ summary: 'Create a family contribution' })
  async createContribution(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFamilyContributionDto,
  ) {
    return { data: await this.service.createContribution(userId, dto) };
  }

  @Put('contributions/:id')
  @ApiOperation({ summary: 'Update a family contribution' })
  async updateContribution(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFamilyContributionDto,
  ) {
    return { data: await this.service.updateContribution(userId, id, dto) };
  }

  @Delete('contributions/:id')
  @ApiOperation({ summary: 'Delete a family contribution' })
  async deleteContribution(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return { data: await this.service.deleteContribution(userId, id) };
  }

  @Get('budget')
  @ApiOperation({ summary: 'Get family budget overview' })
  async getBudget(@CurrentUser('id') userId: string) {
    return { data: await this.service.getBudget(userId) };
  }

  @Get('investments')
  @ApiOperation({ summary: 'Get family investments' })
  async getInvestments(@CurrentUser('id') userId: string) {
    return { data: await this.service.getInvestments(userId) };
  }

  @Post('investments')
  @ApiOperation({ summary: 'Create a family investment' })
  async createInvestment(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFamilyInvestmentDto,
  ) {
    return { data: await this.service.createInvestment(userId, dto) };
  }

  @Put('investments/:id')
  @ApiOperation({ summary: 'Update a family investment' })
  async updateInvestment(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFamilyInvestmentDto,
  ) {
    return { data: await this.service.updateInvestment(userId, id, dto) };
  }

  @Delete('investments/:id')
  @ApiOperation({ summary: 'Delete a family investment' })
  async deleteInvestment(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return { data: await this.service.deleteInvestment(userId, id) };
  }

  @Get('insurance')
  @ApiOperation({ summary: 'Get family insurance' })
  async getInsurance(@CurrentUser('id') userId: string) {
    return { data: await this.service.getInsurance(userId) };
  }

  @Get('emergency-fund')
  @ApiOperation({ summary: 'Get family emergency fund' })
  async getEmergencyFund(@CurrentUser('id') userId: string) {
    return { data: await this.service.getEmergencyFund(userId) };
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Get family tasks' })
  async getTasks(@CurrentUser('id') userId: string) {
    return { data: await this.service.getTasks(userId) };
  }

  @Post('tasks')
  @ApiOperation({ summary: 'Create a family task' })
  async createTask(@CurrentUser('id') userId: string, @Body() dto: CreateFamilyTaskDto) {
    return { data: await this.service.createTask(userId, dto) };
  }

  @Put('tasks/:id')
  @ApiOperation({ summary: 'Update a family task' })
  async updateTask(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFamilyTaskDto,
  ) {
    return { data: await this.service.updateTask(userId, id, dto) };
  }

  @Delete('tasks/:id')
  @ApiOperation({ summary: 'Delete a family task' })
  async deleteTask(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return { data: await this.service.deleteTask(userId, id) };
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get family calendar' })
  async getCalendar(@CurrentUser('id') userId: string) {
    return { data: await this.service.getCalendar(userId) };
  }

  @Get('calendar/events')
  @ApiOperation({ summary: 'Get family calendar events' })
  async getCalendarEvents(@CurrentUser('id') userId: string) {
    return { data: await this.service.getCalendarEvents(userId) };
  }

  @Post('calendar/events')
  @ApiOperation({ summary: 'Create a family calendar event' })
  async createCalendarEvent(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFamilyCalendarEventDto,
  ) {
    return { data: await this.service.createCalendarEvent(userId, dto) };
  }

  @Put('calendar/events/:id')
  @ApiOperation({ summary: 'Update a family calendar event' })
  async updateCalendarEvent(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFamilyCalendarEventDto,
  ) {
    return { data: await this.service.updateCalendarEvent(userId, id, dto) };
  }

  @Delete('calendar/events/:id')
  @ApiOperation({ summary: 'Delete a family calendar event' })
  async deleteCalendarEvent(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return { data: await this.service.deleteCalendarEvent(userId, id) };
  }

  @Get('documents')
  @ApiOperation({ summary: 'Get family documents' })
  async getDocuments(@CurrentUser('id') userId: string) {
    return { data: await this.service.getDocuments(userId) };
  }

  @Post('documents')
  @ApiOperation({ summary: 'Upload a family document' })
  async createDocument(@CurrentUser('id') userId: string, @Body() dto: CreateFamilyDocumentDto) {
    return { data: await this.service.createDocument(userId, dto) };
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete a family document' })
  async deleteDocument(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return { data: await this.service.deleteDocument(userId, id) };
  }

  @Get('ai-advisor')
  @ApiOperation({ summary: 'Get AI advisor insights' })
  async getAIAdvisor(@CurrentUser('id') userId: string) {
    return { data: await this.service.getAIAdvisor(userId) };
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get family reports' })
  async getReports(@CurrentUser('id') userId: string) {
    return { data: await this.service.getReports(userId) };
  }

  @Get('vault')
  @ApiOperation({ summary: 'Get family vault documents' })
  async getVault(@CurrentUser('id') userId: string) {
    return { data: await this.service.getVault(userId) };
  }

  @Get('health-score')
  @ApiOperation({ summary: 'Get family health score' })
  async getHealthScore(@CurrentUser('id') userId: string) {
    return { data: await this.service.getHealthScore(userId) };
  }

  @Get('net-worth')
  @ApiOperation({ summary: 'Get family net worth' })
  async getNetWorth(@CurrentUser('id') userId: string) {
    return { data: await this.service.getNetWorth(userId) };
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get family insights' })
  async getInsights(@CurrentUser('id') userId: string) {
    return { data: await this.service.getInsights(userId) };
  }
}
