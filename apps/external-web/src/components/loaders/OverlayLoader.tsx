'use client';

import React from 'react';
import { useLoadingContext, type ScreenType, type LoadingOptions } from './LoadingContext';
import DashboardLoader from './screens/DashboardLoader';
import SplitLoader from './screens/SplitLoader';
import PaymentLoader from './screens/PaymentLoader';
import CircleLoader from './screens/CircleLoader';
import AiAnalysisLoader from './screens/AiAnalysisLoader';
import OcrLoader from './screens/OcrLoader';
import ReportLoader from './screens/ReportLoader';
import PremiumLoader from './PremiumLoader';
import FactCarouselLoader from './FactCarouselLoader';
import MiniGameLoader from './MiniGameLoader';
import ProgressiveLoader from './ProgressiveLoader';
import SmartProgressBar from './SmartProgressBar';
import ErrorLoadingScreen from './ErrorLoadingScreen';

interface OverlayLoaderProps {
  screenType: ScreenType;
  progress: number;
  error?: string;
  premium?: boolean;
  children: React.ReactNode;
  onRetry?: () => void;
  onErrorDismiss?: () => void;
  loadingSteps?: string[];
  loadingDuration?: number;
}

export default function OverlayLoader({
  screenType,
  progress,
  error,
  premium,
  children,
  onRetry,
  onErrorDismiss,
  loadingSteps,
  loadingDuration,
}: OverlayLoaderProps) {
  const isLoading = progress < 100 && progress >= 0 && !error;
  const hasError = !!error;
  const [showMiniGame, setShowMiniGame] = React.useState(false);

  React.useEffect(() => {
    if (premium && isLoading && progress > 30 && progress < 70) {
      const t = setTimeout(() => setShowMiniGame(true), 1000);
      return () => clearTimeout(t);
    }
    setShowMiniGame(false);
  }, [progress, premium, isLoading]);

  if (hasError) {
    return (
      <div className="w-full max-w-md mx-auto">
        {children}
        <ErrorLoadingScreen
          error={error}
          onRetry={onRetry}
          onDismiss={onErrorDismiss}
          premium={premium}
        />
      </div>
    );
  }

  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {progress > 50 && <div className="opacity-30 pointer-events-none">{children}</div>}

      <div className="flex flex-col items-center justify-center py-8 px-4">
        {screenType === 'dashboard' && <DashboardLoader progress={progress} premium={premium} />}
        {screenType === 'split' && <SplitLoader progress={progress} premium={premium} />}
        {screenType === 'payment' && <PaymentLoader progress={progress} premium={premium} />}
        {screenType === 'circle' && <CircleLoader progress={progress} premium={premium} />}
        {screenType === 'ai-analysis' && <AiAnalysisLoader progress={progress} premium={premium} />}
        {screenType === 'ocr-scan' && <OcrLoader progress={progress} premium={premium} />}
        {screenType === 'report' && <ReportLoader progress={progress} premium={premium} />}
        {screenType === 'default' && (
          <>
            <SmartProgressBar progress={progress} variant="health" size="lg" premium={premium} />
            {loadingSteps && (
              <div className="mt-4 text-center">
                <p className="text-sm" style={{ color: 'var(--dabbu-text-muted)' }}>
                  {
                    loadingSteps[
                      Math.floor((progress / 100) * loadingSteps.length) % loadingSteps.length
                    ]
                  }
                </p>
              </div>
            )}
            {premium && (
              <div className="mt-6">
                <FactCarouselLoader interval={5000} premium />
              </div>
            )}
            {premium && showMiniGame && (
              <div className="mt-4">
                <MiniGameLoader duration={2000} premium />
              </div>
            )}
          </>
        )}

        {premium && screenType !== 'ai-analysis' && (
          <div className="mt-4">
            <PremiumLoader progress={progress} variant="ring" showMiniGame={false} />
          </div>
        )}
      </div>
    </div>
  );
}
