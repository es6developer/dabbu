import { ImageSourcePropType } from 'react-native';
import { LensMode } from '../types';

/* eslint-disable @typescript-eslint/no-var-requires */
const DEFAULT: ImageSourcePropType = require('../../assets/logo.png');
const PERSONAL: ImageSourcePropType = require('../assets/icon-personal.png');
const COUPLE: ImageSourcePropType = require('../assets/icon-couple.png');
const FAMILY: ImageSourcePropType = require('../assets/icon-family.png');
const FULL: ImageSourcePropType = require('../assets/icon-full.png');
/* eslint-enable @typescript-eslint/no-var-requires */

const MAP: Record<string, ImageSourcePropType> = {
  PERSONAL,
  PARTNERED: COUPLE,
  FAMILY,
  FULL,
};

export function getLensLogo(lens: LensMode | null | undefined): ImageSourcePropType {
  if (lens && MAP[lens]) {
    return MAP[lens];
  }
  return DEFAULT;
}
