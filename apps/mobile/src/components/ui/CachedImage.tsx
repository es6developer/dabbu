import { useState } from 'react';
import { Image, View, Animated } from 'react-native';

interface CachedImageProps {
  uri: string;
  style?: any;
  placeholder?: any;
  fallback?: any;
  cacheKey?: string;
}

export function CachedImage({ uri, style, placeholder, fallback, cacheKey }: CachedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const opacity = useState(new Animated.Value(0))[0];

  const onLoad = () => {
    setLoaded(true);
    Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  if (error && fallback) return fallback;
  if (!loaded && placeholder) return placeholder;

  return (
    <Animated.Image
      source={{ uri, cache: 'force-cache' as any }}
      style={[style, { opacity }]}
      onLoad={onLoad}
      onError={() => setError(true)}
    />
  );
}
