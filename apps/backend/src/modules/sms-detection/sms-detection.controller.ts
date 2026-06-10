import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SmsDetectionService } from './sms-detection.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('SMS Detection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sms-detection')
export class SmsDetectionController {
  constructor(private readonly smsDetectionService: SmsDetectionService) {}

  @Get()
  @ApiOperation({ summary: 'Get all SMS detections for user' })
  async getDetections(@CurrentUser('id') userId: string) {
    return this.smsDetectionService.getDetections(userId);
  }

  @Post('parse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Parse an SMS message and detect transaction' })
  async parseSms(
    @CurrentUser('id') userId: string,
    @Body() body: { message: string; sender: string },
  ) {
    return this.smsDetectionService.parseAndSave(userId, body.message, body.sender);
  }

  @Post('detect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Detect and auto-create transaction from SMS' })
  async detectAndCreate(
    @CurrentUser('id') userId: string,
    @Body() body: { message: string; sender: string },
  ) {
    return this.smsDetectionService.detectAndCreateTransaction(userId, body.message, body.sender);
  }

  @Post(':id/add-transaction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually create a transaction from a detection (single click)' })
  async addTransaction(@CurrentUser('id') userId: string, @Param('id') detectionId: string) {
    return this.smsDetectionService.addTransactionFromDetection(userId, detectionId);
  }
}
