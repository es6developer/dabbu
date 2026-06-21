import { WidgetData } from './lens-state.interface';

export abstract class BaseWidget {
  abstract key: string;
  abstract type: string;
  abstract title: string;
  abstract supportedLenses: string[];
  abstract defaultSize: string;
  abstract isVisible: boolean;
  abstract isLocked: boolean;

  abstract fetchData(userId: string, lens: string, config?: Record<string, unknown>): Promise<WidgetData>;
}
