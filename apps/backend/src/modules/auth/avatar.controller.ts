import { Controller, Get, Param, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { randomAvatar } from 'avatarka';

@ApiTags('Avatar')
@Controller('auth/avatar')
export class AvatarController {
  private readonly logger = new Logger(AvatarController.name);
  private readonly theme = 'people';

  @Get(':seed.svg')
  @ApiOperation({ summary: 'Generate and serve a deterministic cartoon avatar as SVG' })
  async getAvatar(@Param('seed') seed: string, @Res() res: Response) {
    try {
      const svg = randomAvatar(this.theme, seed);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.send(svg);
    } catch (err: any) {
      this.logger.error(`Failed to generate avatar for seed "${seed}": ${err.message}`);
      res.status(500).send('<!-- avatar generation failed -->');
    }
  }
}
