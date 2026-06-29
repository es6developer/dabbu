export { LoadingProvider, useLoadingContext } from './LoadingContext';
export type { ScreenType, LoadingOptions, LoadingSession } from './LoadingContext';
export { useLoader } from '@/hooks/useLoader';

export { default as SmartProgressBar } from './SmartProgressBar';
export { default as FactCarouselLoader } from './FactCarouselLoader';
export { default as MiniGameLoader } from './MiniGameLoader';
export { default as PremiumLoader } from './PremiumLoader';
export { default as OverlayLoader } from './OverlayLoader';
export { default as ErrorLoadingScreen } from './ErrorLoadingScreen';

export { default as DashboardLoader } from './screens/DashboardLoader';
export { default as SplitLoader } from './screens/SplitLoader';
export { default as PaymentLoader } from './screens/PaymentLoader';
export { default as CircleLoader } from './screens/CircleLoader';
export { default as AiAnalysisLoader } from './screens/AiAnalysisLoader';
export { default as OcrLoader } from './screens/OcrLoader';
export { default as ReportLoader } from './screens/ReportLoader';

export { getRandomFact, getRandomFacts, FINANCIAL_FACTS } from '@/data/financialFacts';
