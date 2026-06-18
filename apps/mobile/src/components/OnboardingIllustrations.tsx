import React from 'react';
import Svg, { Path, Circle, Rect, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme';

interface IllustrationProps {
  size?: number;
}

function GraphIllustration({ size = 200 }: IllustrationProps) {
  const { colors } = useTheme();
  const c = colors.accent.primary;
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 200 200">
      <Defs>
        <LinearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c} stopOpacity="0.3" />
          <Stop offset="1" stopColor={c} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Circle cx={100} cy={100} r={90} fill={`${c}10`} />
      <Circle cx={100} cy={100} r={70} fill={`${c}08`} />
      {/* Bars */}
      <Rect x="45" y="110" width="18" height="50" rx="6" fill={c} opacity="0.4" />
      <Rect x="70" y="80" width="18" height="80" rx="6" fill={c} opacity="0.6" />
      <Rect x="95" y="95" width="18" height="65" rx="6" fill={c} opacity="0.5" />
      <Rect x="120" y="55" width="18" height="105" rx="6" fill={c} />
      <Rect x="145" y="70" width="18" height="90" rx="6" fill={c} opacity="0.7" />
      {/* Trend line */}
      <Path d="M50 130 L75 95 L100 105 L130 60 L155 80" stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Arrow head */}
      <Path d="M145 65 L155 80 L170 72" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Coin circles */}
      <Circle cx={48} cy={155} r="7" fill={c} opacity="0.8" />
      <Circle cx={48} cy={155} r="3" fill="#FFF" opacity="0.4" />
      <Circle cx={135} cy={148} r="7" fill={c} opacity="0.8" />
      <Circle cx={135} cy={148} r="3" fill="#FFF" opacity="0.4" />
    </Svg>
  );
}

function TargetIllustration({ size = 200 }: IllustrationProps) {
  const { colors } = useTheme();
  const c = colors.accent.primary;
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 200 200">
      <Circle cx={100} cy={100} r={88} fill={`${c}08`} />
      <Circle cx={100} cy={100} r={70} stroke={c} strokeWidth="1.5" fill="none" opacity="0.2" />
      <Circle cx={100} cy={100} r={50} stroke={c} strokeWidth="2" fill="none" opacity="0.35" />
      <Circle cx={100} cy={100} r={30} stroke={c} strokeWidth="2.5" fill="none" opacity="0.6" />
      <Circle cx={100} cy={100} r={14} fill={c} />
      <Circle cx={100} cy={100} r="5" fill="#FFF" />
      {/* Crosshair lines */}
      <Path d="M100 10 L100 190" stroke={c} strokeWidth="1" opacity="0.15" strokeDasharray="4,6" />
      <Path d="M10 100 L190 100" stroke={c} strokeWidth="1" opacity="0.15" strokeDasharray="4,6" />
      {/* Checkmark */}
      <Path d="M130 70 L90 120 L70 100" stroke={c} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PeopleIllustration({ size = 200 }: IllustrationProps) {
  const { colors } = useTheme();
  const c = colors.accent.primary;
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 200 200">
      <Circle cx={100} cy={100} r={88} fill={`${c}08`} />
      {/* Person 1 (left) */}
      <Circle cx={78} cy={78} r="20" stroke={c} strokeWidth="3" fill="none" />
      <Path d="M50 145 Q50 115 78 115 Q106 115 106 145" stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Person 2 (right) */}
      <Circle cx={122} cy={78} r="20" stroke={c} strokeWidth="3" fill="none" />
      <Path d="M94 145 Q94 115 122 115 Q150 115 150 145" stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Overlapping hands */}
      <Path d="M90 90 Q100 80 110 90" stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Heart between them */}
      <Path d="M93 88 Q100 80 107 88 Q107 95 100 102 Q93 95 93 88Z" fill={c} opacity="0.3" />
      {/* Money symbol */}
      <Path d="M96 135 L104 135 M100 132 L100 138" stroke={c} strokeWidth="3" strokeLinecap="round" />
      <Circle cx={100} cy={135} r="8" stroke={c} strokeWidth="2" fill="none" />
    </Svg>
  );
}

function HealthIllustration({ size = 200 }: IllustrationProps) {
  const { colors } = useTheme();
  const c = colors.accent.primary;
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 200 200">
      <Circle cx={100} cy={100} r={88} fill={`${c}08`} />
      {/* Shield */}
      <Path d="M100 30 L155 55 L155 100 Q155 145 100 170 Q45 145 45 100 L45 55 Z" stroke={c} strokeWidth="3" fill={`${c}08`} strokeLinejoin="round" />
      {/* Heart inside shield */}
      <Path d="M88 105 Q80 90 100 100 Q120 90 112 105 L100 125 Z" fill={c} />
      {/* Check */}
      <Circle cx="148" cy="52" r="18" fill={c} />
      <Path d="M140 52 L146 58 L156 46" stroke="#FFF" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Growth mini-arrow */}
      <Path d="M55 140 L75 125 L90 130 L105 115" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    </Svg>
  );
}

export const onboardingIllustrations = [
  GraphIllustration,
  TargetIllustration,
  PeopleIllustration,
  HealthIllustration,
];
