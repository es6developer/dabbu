import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LifeEventsService } from './life-events.service';

@ApiTags('Life Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('life-events')
export class LifeEventsController {
  constructor(private readonly service: LifeEventsService) {}

  @Get()
  @ApiOperation({ summary: 'List all life events for current user' })
  async list(@CurrentUser('id') userId: string) {
    const events = await this.service.list(userId);
    return { data: events };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new life event' })
  async create(
    @Body() body: { eventType: string; title: string; description?: string; eventDate?: string; spaceId?: string; source?: string },
    @CurrentUser('id') userId: string,
  ) {
    const event = await this.service.create(body, userId);
    return { data: event };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a life event (confirm, dismiss, etc.)' })
  async update(
    @Param('id') id: string,
    @Body() body: Partial<{ isConfirmed: boolean; isDismissed: boolean; title: string; description: string; eventDate: string }>,
    @CurrentUser('id') userId: string,
  ) {
    const event = await this.service.update(id, body, userId);
    return { data: event };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a life event' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.service.delete(id, userId);
    return { success: true };
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Life event timeline (chronologically grouped)' })
  async timeline(@CurrentUser('id') userId: string) {
    return { data: await this.service.timeline(userId) };
  }

  @Post('detect')
  @ApiOperation({ summary: 'Trigger AI detection of life events' })
  async detectEvents(@CurrentUser('id') userId: string) {
    return { data: await this.service.detectEvents(userId) };
  }

  @Post(':id/create-plan')
  @ApiOperation({ summary: 'Create a life plan from an event' })
  async createPlanFromEvent(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.service.createPlanFromEvent(id, userId) };
  }
}
