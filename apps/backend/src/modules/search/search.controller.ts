import { Controller, Get, Delete, Query, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { SearchService } from './search.service';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across all entities' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'types', required: false, description: 'Comma-separated: transactions,goals,bills,documents,family,budgets' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'amountMin', required: false })
  @ApiQuery({ name: 'amountMax', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  async globalSearch(
    @CurrentUser('id') userId: string,
    @Query('q') query: string,
    @Query('types') types?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('amountMin') amountMin?: string,
    @Query('amountMax') amountMax?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    await this.searchService.trackRecentSearch(userId, query);
    return this.searchService.globalSearch(userId, query, {
      types: types ? types.split(',') : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      dateFrom,
      dateTo,
      amountMin: amountMin ? parseFloat(amountMin) : undefined,
      amountMax: amountMax ? parseFloat(amountMax) : undefined,
      categoryId,
    });
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions' })
  async getSuggestions(
    @CurrentUser('id') userId: string,
    @Query('q') query: string,
  ) {
    return this.searchService.getSuggestions(userId, query);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent searches' })
  async getRecentSearches(@CurrentUser('id') userId: string) {
    return this.searchService.getRecentSearches(userId);
  }

  @Delete('recent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all recent searches' })
  async clearRecentSearches(@CurrentUser('id') userId: string) {
    await this.searchService.clearRecentSearches(userId);
    return { message: 'Recent searches cleared' };
  }

  @Delete('recent/:query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a specific recent search' })
  async removeRecentSearch(
    @CurrentUser('id') userId: string,
    @Param('query') query: string,
  ) {
    await this.searchService.removeRecentSearch(userId, decodeURIComponent(query));
    return { message: 'Search removed' };
  }
}
