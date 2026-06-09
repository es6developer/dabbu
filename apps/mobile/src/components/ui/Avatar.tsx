import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTheme } from '../../theme';

const svgCache = new Map<string, string>();

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
}

export function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const { colors } = useTheme();
  const [svg, setSvg] = useState<string | null>(svgCache.get(uri || '') || null);
  const mountedRef = useRef(true);

  const initials =
    (name || '')
      .split(' ')
      .filter(Boolean)
      .map((s) => s[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';

  useEffect(() => {
    mountedRef.current = true;
    if (!uri) {
      setSvg(null);
      return;
    }
    if (svgCache.has(uri)) {
      setSvg(svgCache.get(uri)!);
      return;
    }
    let cancelled = false;
    fetch(uri)
      .then((r) => r.text())
      .then((xml) => {
        if (!cancelled && mountedRef.current) {
          svgCache.set(uri, xml);
          setSvg(xml);
        }
      })
      .catch(() => {
        if (!cancelled && mountedRef.current) {
          setSvg(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [uri]);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: svg ? 'transparent' : `${colors.accent.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {svg ? (
        <SvgXml xml={svg} width={size} height={size} />
      ) : (
        <Text
          style={{
            color: colors.accent.primary,
            fontSize: size * 0.38,
            fontWeight: '800',
            letterSpacing: -0.5,
          }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}
