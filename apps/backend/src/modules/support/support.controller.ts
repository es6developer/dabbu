import { Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { SupportService } from './support.service';

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
    @Body() body: { subject: string; message: string; category: string; priority?: string },
  ) {
    return this.supportService.createTicket({
      userId,
      subject: body.subject,
      message: body.message,
      category: body.category,
      priority: body.priority,
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
    @Body() body: { type: 'feedback' | 'bug_report' | 'feature_request'; message: string; rating?: number },
  ) {
    return this.supportService.submitFeedback({ userId, ...body });
  }

  @Get('support/faq')
  @ApiOperation({ summary: 'Get FAQs' })
  async getFAQs() {
    return this.supportService.getFAQs();
  }
}
