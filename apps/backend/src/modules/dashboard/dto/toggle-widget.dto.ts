import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class ToggleWidgetDto {
  @IsString()
  @IsNotEmpty()
  widgetType: string;

  @IsOptional()
  @IsString()
  scope?: string;
}
