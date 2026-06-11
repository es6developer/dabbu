import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { CreateLoanDto, UpdateLoanDto } from './dto/loans.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Loans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @ApiOperation({ summary: 'Create a loan' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateLoanDto) {
    const loan = await this.loansService.create(userId, dto);
    return { data: loan };
  }

  @Get()
  @ApiOperation({ summary: 'Get all loans with totals' })
  async findAll(@CurrentUser('id') userId: string) {
    const result = await this.loansService.findAll(userId);
    return { data: result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single loan' })
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const loan = await this.loansService.findOne(id, userId);
    return { data: loan };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a loan' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLoanDto,
  ) {
    await this.loansService.update(id, userId, dto);
    return { success: true };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a loan' })
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.loansService.remove(id, userId);
    return { success: true };
  }
}
