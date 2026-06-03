import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GamificationService } from './gamification.service';

@ApiTags('Gamification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get user gamification (badges, streaks, progress)' })
  async getUserGamification(@CurrentUser('id') userId: string) {
    return this.gamificationService.getUserGamification(userId);
  }

  @Get('badges')
  @ApiOperation({ summary: 'Get all available badges' })
  async getAllBadges() {
    return { data: await this.gamificationService.getAllBadges() };
  }

  @Post('check')
  @ApiOperation({ summary: 'Check and award any earned badges' })
  async checkBadges(@CurrentUser('id') userId: string) {
    return this.gamificationService.checkAndAwardBadges(userId);
  }

  @Post('streak')
  @ApiOperation({ summary: 'Track user activity streak' })
  async trackStreak(@CurrentUser('id') userId: string) {
    const daily = await this.gamificationService.trackStreak(userId, 'daily');
    await this.gamificationService.trackStreak(userId, 'weekly');
    await this.gamificationService.trackStreak(userId, 'monthly');
    return { data: daily };
  }
}
