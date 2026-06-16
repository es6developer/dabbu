import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { CreateLoanDto, UpdateLoanDto, CreateEmiPaymentDto } from './dto/loans.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PremiumGuard } from '../premium/guards/premium.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Loans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @UseGuards(PremiumGuard)
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
  @UseGuards(PremiumGuard)
  @ApiOperation({ summary: 'Update a loan' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLoanDto,
  ) {
    const loan = await this.loansService.update(id, userId, dto);
    return { data: loan };
  }

  @Delete(':id')
  @UseGuards(PremiumGuard)
  @ApiOperation({ summary: 'Soft delete a loan' })
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.loansService.remove(id, userId);
    return { success: true };
  }

  @Get(':id/amortization')
  @ApiOperation({ summary: 'Get amortization schedule for a loan' })
  async getAmortization(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const result = await this.loansService.getAmortizationSchedule(id, userId);
    return { data: result };
  }

  @Get(':id/projection')
  @ApiOperation({ summary: 'Get payoff projection scenarios for a loan' })
  async getProjection(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const result = await this.loansService.getPayoffProjection(id, userId);
    return { data: result };
  }

  @Post(':id/emi-payments')
  @UseGuards(PremiumGuard)
  @ApiOperation({ summary: 'Record an EMI payment' })
  async recordEmiPayment(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateEmiPaymentDto,
  ) {
    const payment = await this.loansService.recordEmiPayment(id, userId, dto);
    return { data: payment };
  }

  @Get(':id/emi-history')
  @ApiOperation({ summary: 'Get EMI payment history for a loan' })
  async getEmiHistory(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const history = await this.loansService.getEmiHistory(id, userId);
    return { data: history };
  }

  @Get('emi/all-history')
  @ApiOperation({ summary: 'Get all EMI payments across all loans' })
  async getAllEmiHistory(@CurrentUser('id') userId: string) {
    const history = await this.loansService.getAllEmiHistory(userId);
    return { data: history };
  }

  @Get('summary/liabilities')
  @ApiOperation({ summary: 'Get total loan liability for net worth' })
  async getLiabilities(@CurrentUser('id') userId: string) {
    const result = await this.loansService.getLoanLiabilities(userId);
    return { data: result };
  }
}
