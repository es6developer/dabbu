import { ApiProperty } from '@nestjs/swagger';
import { LensType } from '@prisma/client';

class TabConfigDto {
  @ApiProperty() key: string;
  @ApiProperty() label: string;
  @ApiProperty() icon: string;
  @ApiProperty() sortOrder: number;
  @ApiProperty() isVisible: boolean;
  @ApiProperty() isPriority: boolean;
}

class NavigationConfigDto {
  @ApiProperty({ type: [TabConfigDto] }) tabs: TabConfigDto[];
  @ApiProperty({ type: [String] }) hiddenTabs: string[];
  @ApiProperty({ type: [String] }) prioritizedTabs: string[];
}

class ThemeConfigDto {
  @ApiProperty() primaryColor: string;
  @ApiProperty() palette: string;
  @ApiProperty() gradientStart: string;
  @ApiProperty() gradientEnd: string;
  @ApiProperty() darkPrimary: string;
  @ApiProperty() darkGradientStart: string;
  @ApiProperty() darkGradientEnd: string;
  @ApiProperty() accentColor: string;
  @ApiProperty() successColor: string;
  @ApiProperty() warningColor: string;
  @ApiProperty() errorColor: string;
  @ApiProperty() infoColor: string;
  @ApiProperty({ required: false }) subtitle?: string;
}

class WidgetConfigDto {
  @ApiProperty() key: string;
  @ApiProperty() type: string;
  @ApiProperty() title: string;
  @ApiProperty() size: string;
  @ApiProperty() sortOrder: number;
  @ApiProperty() isVisible: boolean;
  @ApiProperty() isLocked: boolean;
}

class QuickActionConfigDto {
  @ApiProperty() key: string;
  @ApiProperty() label: string;
  @ApiProperty() icon: string;
  @ApiProperty() color: string;
  @ApiProperty() sortOrder: number;
  @ApiProperty({ required: false }) screen?: string;
}

class DashboardConfigDto {
  @ApiProperty({ type: [WidgetConfigDto] }) widgets: WidgetConfigDto[];
  @ApiProperty({ type: [QuickActionConfigDto] }) quickActions: QuickActionConfigDto[];
  @ApiProperty() layout: string;
}

class FeatureFlagDto {
  @ApiProperty() enabled: boolean;
  @ApiProperty({ required: false }) config?: Record<string, unknown>;
}

class LensAvailabilityDto {
  @ApiProperty({ enum: LensType }) type: LensType;
  @ApiProperty() name: string;
  @ApiProperty() description?: string;
  @ApiProperty() icon?: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty() isAvailable: boolean;
  @ApiProperty({ required: false }) reason?: string;
}

class LensConfigDto {
  @ApiProperty({ type: NavigationConfigDto }) navigation: NavigationConfigDto;
  @ApiProperty({ type: Object }) features: Record<string, FeatureFlagDto>;
  @ApiProperty({ type: ThemeConfigDto }) theme: ThemeConfigDto;
  @ApiProperty({ type: DashboardConfigDto }) dashboard: DashboardConfigDto;
}

export class LensCurrentResponseDto {
  @ApiProperty({ enum: LensType }) activeLens: LensType;
  @ApiProperty({ enum: LensType, nullable: true }) previousLens: LensType | null;
  @ApiProperty({ type: [LensAvailabilityDto] }) availableLenses: LensAvailabilityDto[];
  @ApiProperty({ type: LensConfigDto }) config: LensConfigDto;
  @ApiProperty() features: Record<string, FeatureFlagDto>;
  @ApiProperty({ nullable: true }) switchedAt: Date | null;
  @ApiProperty() switchedCount: number;
}

export class LensChangeResponseDto {
  @ApiProperty({ enum: LensType }) activeLens: LensType;
  @ApiProperty() message: string;
  @ApiProperty({ type: LensConfigDto }) config: LensConfigDto;
}

export class DashboardResponseDto {
  @ApiProperty({ enum: LensType }) lens: LensType;
  @ApiProperty({ type: [Object] }) widgets: any[];
  @ApiProperty({ type: Object, nullable: true }) dashboard: any;
  @ApiProperty({ type: [Object] }) quickActions: any[];
  @ApiProperty() generatedAt: Date;
}

export class UnifiedDashboardResponseDto {
  @ApiProperty({ enum: LensType }) lens: LensType;
  @ApiProperty({ type: NavigationConfigDto }) navigation: NavigationConfigDto;
  @ApiProperty({ type: [Object] }) widgets: any[];
  @ApiProperty({ type: [Object] }) quickActions: any[];
  @ApiProperty({ type: Object, nullable: true }) dashboard: any;
  @ApiProperty({ type: ThemeConfigDto }) theme: ThemeConfigDto;
  @ApiProperty({ type: Object }) features: Record<string, FeatureFlagDto>;
  @ApiProperty() generatedAt: Date;
}

export class LensFeaturesResponseDto {
  @ApiProperty({ enum: LensType }) activeLens: LensType;
  @ApiProperty({ type: Object }) features: Record<string, FeatureFlagDto>;
}

export class LensNavigationResponseDto {
  @ApiProperty({ enum: LensType }) activeLens: LensType;
  @ApiProperty({ type: [TabConfigDto] }) tabs: TabConfigDto[];
  @ApiProperty({ type: [String] }) hiddenTabs: string[];
}

export class LensWidgetsResponseDto {
  @ApiProperty({ enum: LensType }) lens: LensType;
  @ApiProperty({ type: [WidgetConfigDto] }) availableWidgets: WidgetConfigDto[];
  @ApiProperty({ type: [String] }) activeWidgets: string[];
}

export class LensThemeResponseDto {
  @ApiProperty({ enum: LensType }) lens: LensType;
  @ApiProperty({ type: ThemeConfigDto }) theme: ThemeConfigDto;
}
