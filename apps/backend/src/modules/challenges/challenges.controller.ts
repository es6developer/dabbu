import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChallengesService } from './challenges.service';

@Controller('challenges')
@UseGuards(AuthGuard('jwt'))
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get()
  async getChallenges(@CurrentUser('id') userId: string) {
    const data = await this.challengesService.getChallenges(userId);
    return { data };
  }
}
