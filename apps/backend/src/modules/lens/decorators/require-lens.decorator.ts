import { SetMetadata } from '@nestjs/common';
import { LensType } from '@prisma/client';

export const REQUIRED_LENSES = 'required_lenses';
export const RequireLens = (...lenses: LensType[]) => SetMetadata(REQUIRED_LENSES, lenses);
