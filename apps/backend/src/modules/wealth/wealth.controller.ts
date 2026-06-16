import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WealthService } from './wealth.service';

@Controller('wealth')
@UseGuards(AuthGuard('jwt'))
export class WealthController {
  constructor(private readonly wealthService: WealthService) {}

  @Get('dashboard')
  async getDashboard(@CurrentUser('id') userId: string) {
    const data = await this.wealthService.getDashboard(userId);
    return { data };
  }
}
