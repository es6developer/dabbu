import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

const SVG_CACHE = new Map<string, string>();

function getAvatarsDir(): string {
  const candidates = [
    join(__dirname, 'avatars'),
    join(process.cwd(), 'dist/modules/auth/avatars'),
    join(process.cwd(), 'src/modules/auth/avatars'),
  ];
  for (const dir of candidates) {
    if (existsSync(dir)) {
      return dir;
    }
  }
  return join(__dirname, 'avatars');
}

function loadSvgFile(index: number): string | null {
  const filename = index === 0 ? 'avataaars.svg' : `avataaars (${index}).svg`;
  const key = `avataaars-${index}`;
  if (SVG_CACHE.has(key)) {
    return SVG_CACHE.get(key)!;
  }
  try {
    const content = readFileSync(join(getAvatarsDir(), filename), 'utf-8');
    SVG_CACHE.set(key, content);
    return content;
  } catch {
    return null;
  }
}

@Controller('avatars')
export class AvatarController {
  @Get(':id')
  getAvatar(@Param('id') id: string, @Res() res: Response) {
    const index = parseInt(id, 10);
    if (isNaN(index) || index < 0 || index > 11) {
      throw new NotFoundException('Avatar not found');
    }
    const svg = loadSvgFile(index);
    if (!svg) {
      throw new NotFoundException('Avatar not found');
    }
    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(svg);
  }
}
