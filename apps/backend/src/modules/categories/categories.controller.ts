import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a transaction category' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user categories (optional ?type=income|expense filter)' })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Filter by transaction type (income or expense)' })
  async findAll(@CurrentUser('id') userId: string, @Query('type') type?: string) {
    return this.categoriesService.findAll(userId, type);
  }

  @Get('defaults')
  @ApiOperation({ summary: 'Get default system categories' })
  async getDefaults() {
    return this.categoriesService.getDefaults();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.categoriesService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update category' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete category' })
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.categoriesService.remove(userId, id);
    return { message: 'Category deleted' };
  }
}
