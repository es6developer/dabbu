import { useState, useEffect } from 'react';
import { ImageSourcePropType } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLensLogo } from '../utils/lensLogo';

const STORAGE_KEY = 'dabbu-lens-storage';

export function useLastLensLogo(): ImageSourcePropType {
  const [source, setSource] = useState<ImageSourcePropType>(getLensLogo(null));

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const lens = parsed?.state?.activeLens;
          if (lens) {
            setSource(getLensLogo(lens));
          }
        } catch {
          // ignore parse errors
        }
      }
    });
  }, []);

  return source;
}
