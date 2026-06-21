import { LensType } from '@prisma/client';

export interface LensState {
  activeLens: LensType;
  previousLens: LensType | null;
  availableLenses: LensAvailability[];
  config: LensConfig;
  features: Record<string, FeatureFlagState>;
  switchedAt: Date | null;
  switchedCount: number;
}

export interface LensAvailability {
  type: LensType;
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  isAvailable: boolean;
  reason?: string;
}

export interface LensConfig {
  navigation: NavigationConfig;
  features: Record<string, FeatureFlagState>;
  theme: ThemeConfig;
  dashboard: DashboardConfig;
}

export interface NavigationConfig {
  tabs: TabConfig[];
  hiddenTabs: string[];
  prioritizedTabs: string[];
}

export interface TabConfig {
  key: string;
  label: string;
  icon: string;
  sortOrder: number;
  isVisible: boolean;
  isPriority: boolean;
}

export interface FeatureFlagState {
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface ThemeConfig {
  primaryColor: string;
  palette: string;
  gradientStart: string;
  gradientEnd: string;
  darkPrimary: string;
  darkGradientStart: string;
  darkGradientEnd: string;
  accentColor: string;
  successColor: string;
  warningColor: string;
  errorColor: string;
  infoColor: string;
  subtitle?: string;
}

export interface DashboardConfig {
  widgets: WidgetConfig[];
  quickActions: QuickActionConfig[];
  layout: string;
}

export interface WidgetConfig {
  key: string;
  type: string;
  title: string;
  description?: string;
  size: string;
  sortOrder: number;
  isVisible: boolean;
  isLocked: boolean;
  config?: Record<string, unknown>;
}

export interface QuickActionConfig {
  key: string;
  label: string;
  icon: string;
  color: string;
  sortOrder: number;
  screen?: string;
}

export interface WidgetData {
  key: string;
  type: string;
  title: string;
  data: unknown;
  size: string;
  sortOrder: number;
}
