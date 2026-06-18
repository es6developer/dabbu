# Admin MFA / 2FA Implementation Plan

## Current State
- Backend admin auth has NO MFA support
- AdminUser model has no TOTP fields
- Login flow is email + password only
- No rate limiting on admin login attempts
- No failed-attempt lockout (user auth has 5-attempt lockout, but admin does not)

## Required Changes

### 1. Database (Prisma Schema Migration)
Add to `AdminUser` model:
```prisma
totpSecret    String?   @map("totp_secret")
totpEnabled   Boolean   @default(false) @map("totp_enabled")
backupCodes   String?   @map("backup_codes") // JSON array of 8-12 single-use codes
failedLoginAttempts Int @default(0) @map("failed_login_attempts")
lockedUntil   DateTime? @map("locked_until")
```

### 2. Backend
- Add `speakeasy` or `otplib` npm package for TOTP generation/verification
- Add `POST /admin/auth/mfa/generate` — generates TOTP secret, returns QR code URI
- Add `POST /admin/auth/mfa/verify` — verifies TOTP code & enables MFA
- Add `POST /admin/auth/mfa/backup-codes` — generates backup codes
- Add `POST /admin/auth/login` — modified to check totpEnabled, return `mfaRequired: true` flag
- Add `POST /admin/auth/mfa/challenge` — verify TOTP code and return final access token
- Add rate limiting (5 attempts, 15-min lockout) to admin login endpoint
- Store failed attempts in DB

### 3. Frontend (Admin Panel)
- Add MFA setup page at `/admin/settings/mfa`
  - QR code display (use `qrcode` package or generate QR URL)
  - Manual setup key display
  - Verification input (6-digit code)
  - Backup codes display after setup
- Modify login page:
  - After email/password success, if `mfaRequired: true`, show TOTP input step
  - Fallback to backup code if authenticator unavailable
- Add MFA status indicator in Settings

### 4. Priority
HIGH — Admin panel currently has no second factor, making it the single most
critical security gap. Combined with localStorage-based token storage and
no login rate limiting, a compromised credential grants full admin access.
