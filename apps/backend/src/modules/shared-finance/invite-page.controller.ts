import { Controller, Get, Param, Res, HttpStatus } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import { SharedFinanceService } from './shared-finance.service';

@ApiExcludeController()
@Controller('invite')
export class InvitePageController {
  constructor(private readonly sf: SharedFinanceService) {}

  @Get(':token')
  async renderInvitePage(@Param('token') token: string, @Res() res: Response) {
    try {
      const invite = await this.sf.validateInvite(token);
      const group = invite.group as any;
      const inviter = invite.inviter as any;
      const inviterName = inviter.firstName
        ? `${inviter.firstName} ${inviter.lastName || ''}`
        : inviter.email || 'Someone';
      const groupName = group.name || 'a group';
      const groupIcon = group.icon || '👥';

      const appLink = `dabbu://invite/${token}`;
      const playStoreUrl = 'https://play.google.com/store/apps/details?id=app.dabbu.mobile';

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta property="al:android:url" content="${appLink}" />
  <meta property="al:ios:url" content="${appLink}" />
  <title>Join ${groupName} on Dabbu</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0F0A1E;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: rgba(255,255,255,0.06);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(139,92,246,0.2);
      border-radius: 24px;
      padding: 40px 32px;
      max-width: 400px;
      width: 100%;
      text-align: center;
    }
    .icon { font-size: 56px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px; }
    .subtitle { font-size: 15px; color: rgba(255,255,255,0.6); margin-bottom: 32px; line-height: 1.5; }
    .inviter { font-size: 14px; color: rgba(255,255,255,0.4); margin-bottom: 32px; }
    .btn {
      display: block; width: 100%; padding: 16px; border-radius: 14px;
      background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%);
      color: #FFFFFF; font-size: 17px; font-weight: 700; text-decoration: none;
      border: none; cursor: pointer; transition: opacity 0.2s; margin-bottom: 12px;
    }
    .btn:active { opacity: 0.8; }
    .btn-outline {
      background: transparent; border: 1px solid rgba(255,255,255,0.15);
      color: rgba(255,255,255,0.7); font-weight: 600; font-size: 14px;
    }
    .footer { font-size: 11px; color: rgba(255,255,255,0.25); margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${groupIcon}</div>
    <h1>Join ${groupName}</h1>
    <p class="subtitle">${inviterName} invited you to track shared expenses together.</p>
    <a class="btn" href="${appLink}">Open in Dabbu</a>
    <a class="btn btn-outline" href="${playStoreUrl}" target="_blank">Install Dabbu</a>
    <p class="footer">Powered by Dabbu</p>
  </div>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(HttpStatus.OK).send(html);
    } catch (err: any) {
      const message = err?.message || 'Invalid invite';
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invite Not Found</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0F0A1E;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: rgba(255,255,255,0.06);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(239,68,68,0.2);
      border-radius: 24px;
      padding: 40px 32px;
      max-width: 400px; width: 100%; text-align: center;
    }
    .icon { font-size: 56px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px; }
    p { font-size: 15px; color: rgba(255,255,255,0.6); line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">😕</div>
    <h1>Invite Not Found</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(HttpStatus.NOT_FOUND).send(html);
    }
  }
}
