import React, { useEffect, useState, useRef } from 'react';
import { View, Text } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTheme } from '../../theme';
import { getAvatarXml, getAvatarByIndex } from '../../assets/avatars';

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

  const isLocal = uri?.startsWith('local:');
  const localIndex = isLocal ? parseInt(uri!.replace('local:', ''), 10) : -1;

  const avatarIndexFromUrl =
    !isLocal && uri
      ? (() => {
          const match = uri.match(/\/avatars\/(\d+)/);
          return match ? parseInt(match[1], 10) : -1;
        })()
      : -1;

  const localSvg = isLocal
    ? getAvatarByIndex(localIndex)
    : avatarIndexFromUrl >= 0
      ? getAvatarByIndex(avatarIndexFromUrl)
      : !uri && name
        ? getAvatarXml(name)
        : null;

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
    if (!uri || isLocal || avatarIndexFromUrl >= 0) {
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

  const displaySvg = svg || localSvg;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: displaySvg ? 'transparent' : `${colors.accent.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {displaySvg ? (
        <SvgXml xml={displaySvg} width={size} height={size} preserveAspectRatio="xMidYMid slice" />
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
