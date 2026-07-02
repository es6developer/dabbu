import { Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

@ApiTags('Support')
@Controller()
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('support/tickets')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a support ticket' })
  async createTicket(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTicketDto,
  ) {
    return this.supportService.createTicket({
      userId,
      subject: dto.subject,
      message: dto.message,
      category: dto.category,
      priority: dto.priority,
    });
  }

  @Get('support/tickets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user support tickets' })
  async getUserTickets(@CurrentUser('id') userId: string) {
    return this.supportService.getUserTickets(userId);
  }

  @Get('support/tickets/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get ticket details' })
  async getTicket(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.supportService.getTicketById(userId, id);
  }

  @Post('support/feedback')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit feedback or bug report' })
  async submitFeedback(
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitFeedbackDto,
  ) {
    return this.supportService.submitFeedback({ userId, ...dto });
  }

  @Get('support/faq')
  @ApiOperation({ summary: 'Get FAQs' })
  async getFAQs() {
    return this.supportService.getFAQs();
  }
}
