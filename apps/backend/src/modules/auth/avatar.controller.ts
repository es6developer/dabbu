import { Controller, Get, Param, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import * as crypto from 'crypto';

function hashSeed(seed: string): number[] {
  const hash = crypto.createHash('md5').update(seed).digest('hex');
  return hash.split('').map(c => parseInt(c, 16));
}

function generateAvatarSvg(seed: string): string {
  const vals = hashSeed(seed);
  const size = 100;
  const half = size / 2;
  const cols = 5;
  const rows = 5;
  const cell = size / cols;

  const hue = (vals[0] * 16 + vals[1]) % 360;
  const sat = 50 + (vals[2] % 30);
  const lit = 40 + (vals[3] % 20);
  const bgLight = 85 + (vals[4] % 10);

  let shapes = '';
  let vi = 5;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < Math.ceil(cols / 2); c++) {
      const val = vals[vi % vals.length];
      vi++;
      if (val < 8) continue;

      const x = c * cell;
      const y = r * cell;
      const variant = val % 3;

      if (variant === 0) {
        shapes += `<circle cx="${x + cell / 2}" cy="${y + cell / 2}" r="${cell * 0.4}" fill="hsl(${hue + val * 10}, ${sat}%, ${lit + (val % 15)}%)" opacity="0.9"/>`;
      } else if (variant === 1) {
        shapes += `<rect x="${x + 2}" y="${y + 2}" width="${cell - 4}" height="${cell - 4}" rx="4" fill="hsl(${hue + val * 20}, ${sat}%, ${lit + (val % 15)}%)" opacity="0.85"/>`;
      } else {
        shapes += `<polygon points="${x + cell / 2},${y + 2} ${x + cell - 2},${y + cell - 2} ${x + 2},${y + cell - 2}" fill="hsl(${hue + val * 30}, ${sat}%, ${lit + (val % 15)}%)" opacity="0.85"/>`;
      }

      const mirrorX = (cols - 1 - c) * cell;
      if (mirrorX !== x) {
        if (variant === 0) {
          shapes += `<circle cx="${mirrorX + cell / 2}" cy="${y + cell / 2}" r="${cell * 0.4}" fill="hsl(${hue + val * 10}, ${sat}%, ${lit + (val % 15)}%)" opacity="0.9"/>`;
        } else if (variant === 1) {
          shapes += `<rect x="${mirrorX + 2}" y="${y + 2}" width="${cell - 4}" height="${cell - 4}" rx="4" fill="hsl(${hue + val * 20}, ${sat}%, ${lit + (val % 15)}%)" opacity="0.85"/>`;
        } else {
          shapes += `<polygon points="${mirrorX + cell / 2},${y + 2} ${mirrorX + cell - 2},${y + cell - 2} ${mirrorX + 2},${y + cell - 2}" fill="hsl(${hue + val * 30}, ${sat}%, ${lit + (val % 15)}%)" opacity="0.85"/>`;
        }
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${half}" fill="hsl(${hue}, ${sat}%, ${bgLight}%)"/>
  ${shapes}
</svg>`;
}

@ApiTags('Avatar')
@Controller('auth/avatar')
export class AvatarController {
  private readonly logger = new Logger(AvatarController.name);

  @Get(':seed.svg')
  @ApiOperation({ summary: 'Generate and serve a deterministic avatar as SVG' })
  async getAvatar(@Param('seed') seed: string, @Res() res: Response) {
    try {
      const svg = generateAvatarSvg(seed);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.send(svg);
    } catch (err: any) {
      this.logger.error(`Failed to generate avatar for seed "${seed}": ${err.message}`);
      res.status(500).send('<!-- avatar generation failed -->');
    }
  }
}
