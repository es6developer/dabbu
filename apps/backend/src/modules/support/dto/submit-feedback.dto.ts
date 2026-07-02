import { IsString, IsNumber, IsOptional, IsIn, IsNotEmpty } from 'class-validator';

export class SubmitFeedbackDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['feedback', 'bug_report', 'feature_request'])
  type: 'feedback' | 'bug_report' | 'feature_request';

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsNumber()
  rating?: number;
}
