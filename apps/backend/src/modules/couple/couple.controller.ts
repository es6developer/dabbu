import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsEmail, IsBoolean, IsNotEmpty } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CoupleService } from './couple.service';

class AddPartnerDto {
  @IsEmail()
  @IsNotEmpty()
  partnerEmail: string;
}

class ToggleModeDto {
  @IsBoolean()
  @IsNotEmpty()
  isCoupleMode: boolean;
}

@ApiTags('Couple')
@Controller('couple')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CoupleController {
  constructor(private readonly coupleService: CoupleService) {}

  @Post('add-partner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a partner by email to create a couple' })
  async addPartner(@CurrentUser('id') userId: string, @Body() dto: AddPartnerDto) {
    return this.coupleService.addPartner(userId, dto.partnerEmail);
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
}
