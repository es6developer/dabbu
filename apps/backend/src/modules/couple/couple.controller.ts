import {
  Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsBoolean, IsNotEmpty } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CoupleService } from './couple.service';

class SendRequestDto { @IsString() @IsNotEmpty() phone: string; }
class ToggleModeDto { @IsBoolean() @IsNotEmpty() isCoupleMode: boolean; }
class JoinDto { @IsString() @IsNotEmpty() code: string; }
class AddSharedSavingDto {
  @IsNotEmpty() amount: number;
  notes?: string;
}

@ApiTags('Couple')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('couple')
export class CoupleController {
  constructor(private readonly coupleService: CoupleService) {}

  @Post('send-request')
  @ApiOperation({ summary: 'Send a couple request by phone number' })
  async sendRequest(@CurrentUser('id') userId: string, @Body() dto: SendRequestDto) {
    return this.coupleService.sendRequest(userId, dto.phone);
  }

  @Post('approve-request/:id')
  @ApiOperation({ summary: 'Approve a pending couple request' })
  async approveRequest(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.coupleService.approveRequest(userId, id);
  }

  @Post('reject-request/:id')
  @ApiOperation({ summary: 'Reject a pending couple request' })
  async rejectRequest(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.coupleService.rejectRequest(userId, id);
  }

  @Post('cancel-request/:id')
  @ApiOperation({ summary: 'Cancel a sent couple request' })
  async cancelRequest(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.coupleService.cancelRequest(userId, id);
  }

  @Get('requests')
  @ApiOperation({ summary: 'List sent and received couple requests' })
  async listRequests(@CurrentUser('id') userId: string) {
    return this.coupleService.listRequests(userId);
  }

  @Post('toggle-mode')
  @ApiOperation({ summary: 'Toggle couple mode on/off' })
  async toggleMode(@CurrentUser('id') userId: string, @Body() dto: ToggleModeDto) {
    return this.coupleService.toggleMode(userId, dto.isCoupleMode);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current couple status and partner info' })
  async getStatus(@CurrentUser('id') userId: string) {
    return this.coupleService.getStatus(userId);
  }

  @Post('remove-partner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove couple relationship' })
  async removePartner(@CurrentUser('id') userId: string) {
    return this.coupleService.removePartner(userId);
  }

  @Post('create-invite')
  @ApiOperation({ summary: 'Generate an invite code for partner' })
  async createInvite(@CurrentUser('id') userId: string) {
    return this.coupleService.createInviteCode(userId);
  }

  @Post('join')
  @ApiOperation({ summary: 'Join couple space via invite code' })
  async join(@CurrentUser('id') userId: string, @Body() dto: JoinDto) {
    return this.coupleService.joinWithCode(userId, dto.code);
  }

  @Get('planners')
  @ApiOperation({ summary: 'List couple planners' })
  async getPlanners(@CurrentUser('id') userId: string) {
    return this.coupleService.getPlanners(userId);
  }

  @Post('planners/:type')
  @ApiOperation({ summary: 'Create a planner' })
  async createPlanner(@CurrentUser('id') userId: string, @Param('type') type: string, @Body() body: any) {
    return this.coupleService.createPlanner(userId, type, body);
  }

  @Post('planners/:id/contribute')
  @ApiOperation({ summary: 'Contribute to a planner' })
  async contributeToPlanner(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() body: any) {
    return this.coupleService.contributeToPlanner(userId, id, body);
  }

  @Get('planner/:type')
  @ApiOperation({ summary: 'Get planner by type' })
  async getPlannerByType(@CurrentUser('id') userId: string, @Param('type') type: string) {
    return this.coupleService.getPlannerByType(userId, type);
  }

  @Post('shared-savings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a shared saving record' })
  async addSharedSaving(@CurrentUser('id') userId: string, @Body() dto: AddSharedSavingDto) {
    return this.coupleService.addSharedSaving(userId, dto.amount, dto.notes);
  }

  @Get('coach')
  @ApiOperation({ summary: 'Get AI coach insights' })
  async getCoach(@CurrentUser('id') userId: string) {
    return this.coupleService.getCoach(userId);
  }

  @Get('gamification')
  @ApiOperation({ summary: 'Get couple gamification data' })
  async getGamification(@CurrentUser('id') userId: string) {
    return this.coupleService.getGamification(userId);
  }
}
