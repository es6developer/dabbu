import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsBoolean, IsNotEmpty } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CoupleService } from './couple.service';

class SendRequestDto {
  @IsString()
  @IsNotEmpty()
  phone: string;
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

  @Post('send-request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a couple request by phone number' })
  async sendRequest(@CurrentUser('id') userId: string, @Body() dto: SendRequestDto) {
    return this.coupleService.sendRequest(userId, dto.phone);
  }

  @Post('approve-request/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending couple request' })
  async approveRequest(@CurrentUser('id') userId: string, @Param('id') requestId: string) {
    return this.coupleService.approveRequest(userId, requestId);
  }

  @Post('reject-request/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending couple request' })
  async rejectRequest(@CurrentUser('id') userId: string, @Param('id') requestId: string) {
    return this.coupleService.rejectRequest(userId, requestId);
  }

  @Post('cancel-request/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a sent couple request' })
  async cancelRequest(@CurrentUser('id') userId: string, @Param('id') requestId: string) {
    return this.coupleService.cancelRequest(userId, requestId);
  }

  @Get('requests')
  @ApiOperation({ summary: 'List sent and received couple requests' })
  async listRequests(@CurrentUser('id') userId: string) {
    return this.coupleService.listRequests(userId);
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
