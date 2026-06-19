import { Controller, Get, Post, Body, Patch, UseGuards, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import {
  SearchUsersDto,
  UpdateProfileDto,
  MatchContactsDto,
  SyncContactsDto,
} from './dto/users.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search users by name, email, or phone' })
  async search(@Query() dto: SearchUsersDto, @CurrentUser('id') userId: string) {
    const users = await this.usersService.search(dto.query, userId);
    return { data: users };
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update own profile (name, phone)' })
  async updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    const user = await this.usersService.updateProfile(userId, dto);
    return { data: user };
  }

  @Post('match-contacts')
  @ApiOperation({ summary: 'Match device contacts by 10-digit phone numbers' })
  async matchContacts(@CurrentUser('id') userId: string, @Body() dto: MatchContactsDto) {
    const result = await this.usersService.matchContacts(userId, dto.phones);
    return { matched: result };
  }

  @Post('contacts/sync')
  @ApiOperation({ summary: 'Sync hashed contacts to find registered users' })
  async syncContacts(@CurrentUser('id') userId: string, @Body() dto: SyncContactsDto) {
    const result = await this.usersService.syncContacts(userId, dto.hashes);
    return { data: result };
  }

  @Get('validate-upi')
  @ApiOperation({ summary: 'Validate UPI ID via external API' })
  @ApiQuery({ name: 'upiId', required: true })
  async validateUpi(@Query('upiId') upiId: string) {
    return this.usersService.validateUpi(upiId);
  }

  @Patch('lens')
  @ApiOperation({ summary: 'Update active lens (PERSONAL, PARTNERED, FAMILY, FULL)' })
  async updateLens(@CurrentUser('id') userId: string, @Body('lens') lens: string) {
    const valid = ['PERSONAL', 'PARTNERED', 'FAMILY', 'FULL'];
    if (!valid.includes(lens)) throw new Error('Invalid lens. Must be one of: ' + valid.join(', '));
    const user = await this.usersService.updateLens(userId, lens);
    return { data: { activeLens: user.activeLens } };
  }
}
