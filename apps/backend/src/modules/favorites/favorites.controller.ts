import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FavoritesService } from './favorites.service';
import { AddFavoriteDto } from './dto/favorites.dto';

@ApiTags('Favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post('add')
  @ApiOperation({ summary: 'Add a user to favorites' })
  async add(@CurrentUser('id') userId: string, @Body() dto: AddFavoriteDto) {
    return { data: await this.favoritesService.add(userId, dto.contactUserId) };
  }

  @Delete(':contactUserId')
  @ApiOperation({ summary: 'Remove a user from favorites' })
  async remove(@CurrentUser('id') userId: string, @Param('contactUserId') contactUserId: string) {
    return { data: await this.favoritesService.remove(userId, contactUserId) };
  }

  @Get()
  @ApiOperation({ summary: 'List all favorite contacts' })
  async list(@CurrentUser('id') userId: string) {
    return { data: await this.favoritesService.list(userId) };
  }
}
