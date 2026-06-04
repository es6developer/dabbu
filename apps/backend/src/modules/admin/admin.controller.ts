import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminGuard, Roles } from './guards';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import {
  AdminLoginDto,
  AdminCreateDto,
  ListUsersQueryDto,
  UpdateUserStatusDto,
  BroadcastNotificationDto,
  ListAuditLogsQueryDto,
  CreatePlanDto,
  UpdatePlanDto,
  CreateFeatureFlagDto,
} from './dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login' })
  async login(@Body() dto: AdminLoginDto) {
    const result = await this.adminService.login(dto);
    return { data: result };
  }

  @UseGuards(AdminGuard)
  @Roles('super_admin')
  @ApiBearerAuth()
  @Post('auth/create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new admin user (super_admin only)' })
  async createAdmin(@Body() dto: AdminCreateDto, @CurrentAdmin('id') adminId: string) {
    const result = await this.adminService.createAdmin(dto, adminId);
    return { data: result };
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get system dashboard statistics' })
  async getDashboardStats() {
    const stats = await this.adminService.getDashboardStats();
    return { data: stats };
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Get('users')
  @ApiOperation({ summary: 'List all users with search and pagination' })
  async listUsers(@Query() query: ListUsersQueryDto) {
    const result = await this.adminService.listUsers(query);
    return result;
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Get('users/:id')
  @ApiOperation({ summary: 'Get user detail' })
  async getUserDetail(@Param('id') id: string) {
    const user = await this.adminService.getUserDetail(id);
    return { data: user };
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentAdmin('id') adminId: string,
  ) {
    const result = await this.adminService.updateUserStatus(id, dto, adminId);
    return { data: result };
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a user' })
  async deleteUser(@Param('id') id: string, @CurrentAdmin('id') adminId: string) {
    const result = await this.adminService.deleteUser(id, adminId);
    return { data: result };
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Get('families')
  @ApiOperation({ summary: 'List all families' })
  async listFamilies(@Query('page') page?: number, @Query('limit') limit?: number) {
    const result = await this.adminService.listFamilies(page, limit);
    return result;
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Get('families/:id')
  @ApiOperation({ summary: 'Get family detail' })
  async getFamilyDetail(@Param('id') id: string) {
    const family = await this.adminService.getFamilyDetail(id);
    return { data: family };
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Delete('families/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a family' })
  async deleteFamily(@Param('id') id: string, @CurrentAdmin('id') adminId: string) {
    const result = await this.adminService.deleteFamily(id, adminId);
    return { data: result };
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Get('audit-logs')
  @ApiOperation({ summary: 'List audit logs' })
  async listAuditLogs(@Query() query: ListAuditLogsQueryDto) {
    const result = await this.adminService.listAuditLogs(query);
    return result;
  }

  @UseGuards(AdminGuard)
  @Roles('super_admin', 'admin')
  @ApiBearerAuth()
  @Post('notifications/broadcast')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send push notification to all users' })
  async broadcastNotification(
    @Body() dto: BroadcastNotificationDto,
    @CurrentAdmin('id') adminId: string,
  ) {
    const result = await this.adminService.broadcastNotification(dto, adminId);
    return { data: result };
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Get('configuration')
  @ApiOperation({ summary: 'Get app configuration' })
  async getConfig() {
    const config = await this.adminService.getConfig();
    return { data: config };
  }

  @UseGuards(AdminGuard)
  @Roles('super_admin', 'admin')
  @ApiBearerAuth()
  @Patch('configuration')
  @ApiOperation({ summary: 'Update app configuration' })
  async updateConfig(@Body() dto: Record<string, any>, @CurrentAdmin('id') adminId: string) {
    const config = await this.adminService.updateConfig(dto, adminId);
    return { data: config };
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Get('plans')
  @ApiOperation({ summary: 'List all subscription plans' })
  async listPlans() {
    const plans = await this.adminService.listPlans();
    return { data: plans };
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Get('plans/:id')
  @ApiOperation({ summary: 'Get a subscription plan' })
  async getPlan(@Param('id') id: string) {
    const plan = await this.adminService.getPlan(id);
    return { data: plan };
  }

  @UseGuards(AdminGuard)
  @Roles('super_admin', 'admin')
  @ApiBearerAuth()
  @Post('plans')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a subscription plan' })
  async createPlan(@Body() dto: CreatePlanDto, @CurrentAdmin('id') adminId: string) {
    const plan = await this.adminService.createPlan(dto, adminId);
    return { data: plan };
  }

  @UseGuards(AdminGuard)
  @Roles('super_admin', 'admin')
  @ApiBearerAuth()
  @Patch('plans/:id')
  @ApiOperation({ summary: 'Update a subscription plan' })
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
    @CurrentAdmin('id') adminId: string,
  ) {
    const plan = await this.adminService.updatePlan(id, dto, adminId);
    return { data: plan };
  }

  @UseGuards(AdminGuard)
  @Roles('super_admin')
  @ApiBearerAuth()
  @Delete('plans/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a subscription plan' })
  async deletePlan(@Param('id') id: string, @CurrentAdmin('id') adminId: string) {
    const result = await this.adminService.deletePlan(id, adminId);
    return { data: result };
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Get('feature-flags')
  @ApiOperation({ summary: 'List all feature flags' })
  async listFeatureFlags() {
    const flags = await this.adminService.listFeatureFlags();
    return { data: flags };
  }

  @UseGuards(AdminGuard)
  @Roles('super_admin', 'admin')
  @ApiBearerAuth()
  @Post('feature-flags')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a feature flag' })
  async createFeatureFlag(@Body() dto: CreateFeatureFlagDto, @CurrentAdmin('id') adminId: string) {
    const flag = await this.adminService.createFeatureFlag(dto, adminId);
    return { data: flag };
  }

  @UseGuards(AdminGuard)
  @Roles('super_admin', 'admin')
  @ApiBearerAuth()
  @Patch('feature-flags/:id')
  @ApiOperation({ summary: 'Toggle a feature flag' })
  async toggleFeatureFlag(
    @Param('id') id: string,
    @Body() dto: { isEnabled: boolean },
    @CurrentAdmin('id') adminId: string,
  ) {
    const flag = await this.adminService.toggleFeatureFlag(id, dto.isEnabled, adminId);
    return { data: flag };
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Get('subscriptions')
  @ApiOperation({ summary: 'List all subscriptions' })
  async listSubscriptions(@Query('page') page?: number, @Query('limit') limit?: number) {
    const result = await this.adminService.listSubscriptions(page, limit);
    return result;
  }

  @Get('maintenance')
  @ApiOperation({ summary: 'Public maintenance mode status check' })
  async getMaintenanceStatus() {
    const config = await this.adminService.getConfig();
    return {
      data: {
        maintenanceMode: config.maintenanceMode,
        maintenanceMessage: config.maintenanceMessage,
      },
    };
  }
}
