# Security Policy

## Authentication & Authorization

| Feature | Implementation | Status |
|---------|---------------|--------|
| JWT Access Tokens | 15-30 minute expiry, signed with HS256 | ✅ |
| Refresh Tokens | Opaque 64-byte random, rotated on use, 7-30d expiry | ✅ |
| Session Management | View active sessions, remote revocation | ✅ |
| Biometric Auth | Device-level Face ID / Fingerprint | ✅ |
| App Lock PIN | 4-6 digit PIN, bcrypt-hashed, auto-lock on background | ✅ |
| OTP Verification | 6-digit OTP, bcrypt-hashed, 5-min expiry, rate-limited | ✅ |
| Password Policy | Min 8 chars, uppercase, lowercase, digit, special char | ✅ |
| Password History | Prevents reuse of last N passwords | ✅ |
| Brute Force Protection | 5 attempts -> 15-min lockout | ✅ |
| RBAC | User, Premium, Admin, Super Admin roles | ✅ |

## Data Protection

| Feature | Implementation | Status |
|---------|---------------|--------|
| Transport Security | TLS 1.3 (via Traefik reverse proxy) | ✅ |
| Password Storage | bcrypt (12 rounds) | ✅ |
| Document Encryption | AES-256-CBC with per-file IV | ✅ |
| OTP Storage | bcrypt-hashed | ✅ |
| Contact Privacy | SHA-256 hashed phone numbers | ✅ |
| PII Minimization | Minimal data collection | ✅ |

## API Security

| Feature | Implementation | Status |
|---------|---------------|--------|
| Rate Limiting | 100 req/min global + 10 auth req/15min | ✅ |
| CORS | Whitelist-based origin validation | ✅ |
| Security Headers | Helmet (CSP, HSTS, XSS, nosniff, frameguard) | ✅ |
| Request Validation | class-validator whitelist + forbidNonWhitelisted | ✅ |
| SQL Injection | Prisma ORM (parameterized queries) | ✅ |
| Webhook Verification | Razorpay signature validation | ✅ |
| Webhook Dedup | Unique event ID enforcement | ✅ |

## Infrastructure Security

| Feature | Implementation | Status |
|---------|---------------|--------|
| Docker | Non-root user, multi-stage builds | ✅ |
| Secrets Management | Environment variables via .env | ✅ |
| Network Isolation | Docker internal networks | ✅ |
| SSL/TLS | Let's Encrypt via Traefik | ✅ |
| Health Checks | DB, Redis, memory, CPU monitoring | ✅ |

## Incident Response

1. **Detection**: Sentry alerts + health check monitoring
2. **Containment**: Rate limiting + session revocation
3. **Recovery**: Database backup restoration + rollback
4. **Post-mortem**: Audit log analysis + security review

## Responsible Disclosure

Report security vulnerabilities to: **security@dabbu.app**

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We aim to respond within 24 hours and patch critical issues within 72 hours.
