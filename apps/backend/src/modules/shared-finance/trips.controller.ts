import {
  Controller, Get, Post, Patch, Body, Param,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripDto, UpdateTripDto, CreateTripDayDto } from './dto/expenses.dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Shared Finance - Trips')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shared-finance/groups/:groupId/trip')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create trip' })
  async create(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateTripDto,
  ) {
    return this.tripsService.create(groupId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get trip detail' })
  async findOne(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
  ) {
    return this.tripsService.findOne(groupId, user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update trip' })
  async update(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateTripDto,
  ) {
    return this.tripsService.update(groupId, user.id, dto);
  }

  @Post('days')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add trip day' })
  async addDay(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateTripDayDto,
  ) {
    return this.tripsService.addDay(groupId, user.id, dto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Trip dashboard with budget, daily spend, insights' })
  async getDashboard(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
  ) {
    return this.tripsService.getDashboard(groupId, user.id);
  }
}
