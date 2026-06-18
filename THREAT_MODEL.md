# Dabbu Threat Model

## Trust Boundaries

```
[User Device] <--TLS--> [API Gateway] <---> [Application Server] <---> [Database]
                                     |              |
                                     |              +---> [Redis/Queue]
                                     |
                                     +---> [CDN/Static Assets]
```

## Asset Inventory

| Asset | Sensitivity | Storage | Encryption |
|-------|------------|---------|------------|
| User Credentials (password hash) | Critical | MySQL | bcrypt (12 rounds) |
| JWT Secret | Critical | ENV var | N/A |
| Document Encryption Key | Critical | ENV var | N/A |
| Financial Transactions | High | MySQL | TLS in transit |
| Bank Account Details | High | MySQL | TLS in transit |
| User Documents (Aadhaar, PAN) | Critical | Disk/S3 | AES-256-CBC |
| Push Notification Tokens | Medium | MySQL | N/A |
| Session Tokens | High | MySQL | bcrypt |
| Audit Logs | Medium | MySQL | N/A |
| OTP Codes | Medium | MySQL (hashed) | bcrypt |
| Email Addresses | Medium | MySQL | N/A |

## Threat Scenarios & Mitigations

### T1: Unauthorized Account Access
**Risk**: Critical | **Likelihood**: Medium
- **Vector**: Stolen JWT, brute force, session hijacking
- **Mitigations**:
  - Short-lived access tokens (15-30 min)
  - Refresh token rotation with revocation
  - Brute force lockout (5 attempts -> 15 min)
  - Session management dashboard
  - Device tracking with alerts

### T2: Data Breach (Database)
**Risk**: Critical | **Likelihood**: Low
- **Vector**: SQL injection, exposed database port, compromised credentials
- **Mitigations**:
  - Prisma ORM prevents SQL injection
  - MySQL not exposed to internet (Docker internal network)
  - Passwords bcrypt-hashed
  - Documents encrypted at rest
  - Database backup encryption

### T3: Payment Fraud
**Risk**: High | **Likelihood**: Low
- **Vector**: Webhook replay, forged payment notifications
- **Mitigations**:
  - Razorpay webhook signature verification
  - Webhook event deduplication
  - Payment audit trail
  - Idempotency on subscription operations

### T4: API Abuse
**Risk**: Medium | **Likelihood**: High
- **Vector**: DDoS, credential stuffing, scraping
- **Mitigations**:
  - Dual-layer rate limiting (global + auth)
  - IP-based rate limiting in production
  - Request validation (class-validator)
  - CORS whitelist

### T5: Document Leakage
**Risk**: High | **Likelihood**: Low
- **Vector**: Insecure direct object reference, compromised storage
- **Mitigations**:
  - Per-file AES-256-CBC encryption
  - Document access audit logs
  - User-scoped document queries
  - File type validation on upload

### T6: Session Hijacking
**Risk**: High | **Likelihood**: Medium
- **Vector**: XSS, token interception, device theft
- **Mitigations**:
  - HttpOnly cookies (where applicable)
  - JWT not stored in localStorage
  - Biometric/PIN app lock
  - Session revocation on password change
  - New device login alerts

### T7: Insider Threat
**Risk**: Medium | **Likelihood**: Low
- **Vector**: Malicious admin, compromised admin account
- **Mitigations**:
  - Granular RBAC (super_admin, admin, support)
  - Complete audit logging for all admin actions
  - Admin session management
  - Separate admin authentication

### T8: Supply Chain Attack
**Risk**: Medium | **Likelihood**: Low
- **Vector**: Compromised npm package, dependency vulnerability
- **Mitigations**:
  - Lockfile (package-lock.json)
  - npm audit in CI pipeline
  - Minimal dependency principle
  - Regular dependency updates

## Security Controls Summary

### Preventive Controls
1. Input validation (class-validator)
2. Authentication (JWT + refresh tokens)
3. Authorization (RBAC + guards)
4. Rate limiting (ThrottlerGuard)
5. Security headers (Helmet)
6. CORS whitelist
7. SQL injection prevention (Prisma)

### Detective Controls
1. Audit logging (AuditLog table)
2. Sentry error tracking
3. Login activity monitoring
4. Anomaly detection (AI engine)
5. Health check monitoring
6. Webhook deduplication

### Corrective Controls
1. Session revocation
2. Account lockout
3. Automated device deactivation
4. Database rollback capability
5. Rate limit escalation

## Data Flow Diagrams

### Authentication Flow
```
User -> POST /auth/login -> Validate credentials -> Generate JWT + Refresh Token
  -> Create Session -> Return tokens -> User stores JWT in memory
  -> JWT sent as Bearer token on subsequent requests
  -> Access token expires -> POST /auth/refresh -> Rotate tokens
  -> Refresh token expires -> Re-authentication required
```

### Payment Flow
```
User -> POST /premium/subscribe -> Create Razorpay subscription
  -> Redirect to Razorpay checkout -> Payment completed
  -> Razorpay sends webhook -> Verify webhook signature
  -> Update subscription status -> Create payment record
  -> Enable premium entitlements -> Send confirmation notification
```

### Document Upload Flow
```
User -> POST /documents/upload -> File validation (type, size)
  -> AES-256-CBC encrypt file -> Upload to storage (S3/local)
  -> Save encrypted path + IV to database
  -> AUDIT: DocumentAuditLog.create('upload')
  -> Return document metadata
```

## Security Testing Schedule

| Test Type | Frequency | Tool |
|-----------|-----------|------|
| Dependency Scan | Weekly | npm audit, Snyk |
| SAST | Per PR | ESLint security plugins |
| Secret Scanning | Per commit | git-secrets, trufflehog |
| DAST | Monthly | OWASP ZAP |
| Penetration Test | Quarterly | External vendor |
| Bug Bounty | Ongoing | HackerOne (future) |
