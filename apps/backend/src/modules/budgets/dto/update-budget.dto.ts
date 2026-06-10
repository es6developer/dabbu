import { PartialType } from '@nestjs/swagger';
import { CreateBudgetDto } from './create-budget.dto';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBudgetDto extends PartialType(CreateBudgetDto) {
  @ApiPropertyOptional({ example: 8000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  spent?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: boolean;
}
