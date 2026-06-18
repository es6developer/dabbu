# Dabbu Compliance Framework

## Regulatory Coverage

| Regulation | Status | Details |
|------------|--------|---------|
| GDPR (EU) | ✅ Implemented | Data export, deletion, consent management |
| CCPA (California) | ✅ Implemented | Right to know, delete, opt-out of sale |
| Indian IT Act 2000 | ✅ Implemented | Data localization, reasonable security practices |
| Indian DPDP Act 2023 | ⚠️ Partial | Implementation pending final rules |

## 1. CCPA Compliance (California Consumer Privacy Act)

### Rights Implemented
- **Right to Know**: Users can download all collected data via `GET /compliance/gdpr-data`
- **Right to Delete**: Users can request account deletion via `POST /compliance/delete-account`
- **Right to Opt-Out**: Users can opt out of data sale via cookie consent preferences
- **Right to Non-Discrimination**: All features available regardless of CCPA rights exercise

### Data Categories Collected
1. Identifiers: name, email, phone, device IDs
2. Financial information: transactions, accounts, bills, goals
3. Commercial information: subscription history, payment records
4. Internet activity: app usage, feature interactions
5. Geolocation data: IP-based location (not precise GPS)
6. Inferences: financial health scores, spending patterns

### Data Sharing
- No sale of personal information
- Service providers: hosting (AWS/Render), email (Resend/SendGrid), push notifications (Firebase)
- Financial data is encrypted at rest and never shared with third parties

## 2. Indian IT Act 2000 & DPDP Act 2023 Compliance

### Reasonable Security Practices (IT Act Section 43A)
- ISO 27001-aligned security controls
- Data encryption at rest (AES-256) and in transit (TLS 1.3)
- Access controls with RBAC
- Regular security audits
- Incident response procedure

### Data Localization (DPDP Act)
- Primary database: MySQL on Aiven Cloud (India region)
- Cache: Redis (same region as database)
- Backups: Encrypted, stored in same region
- CDN: Global (Cloudflare) with Indian edge nodes

### Consent Management
- Explicit consent for data collection
- Consent withdrawal mechanism
- Consent records stored in `cookie_consents` table
- Notice at collection

### Grievance Officer
- Name: [To be assigned]
- Email: grievance@dabbu.app
- Response time: 24 hours for initial acknowledgment
- Resolution: 30 days maximum

## 3. Data Retention Schedule

| Data Type | Retention Period | Rationale |
|-----------|-----------------|-----------|
| Transaction records | 7 years | Tax compliance (India) |
| Account/banking info | Until account deletion | Service necessity |
| User profile | Until deletion request | Service necessity |
| Audit logs | 3 years | Security & compliance |
| Analytics events | 26 months | Industry standard |
| Notification logs | 6 months | Operational |
| Support tickets | 3 years | Service improvement |
| Backup data | 30 days (rolling) | Disaster recovery |
| Deleted accounts | 90 days (grace period) | Recovery window |

## 4. Data Breach Notification Procedure

### Timeline (GDPR Article 33)
1. **Detection**: Automated monitoring alerts on-call engineer
2. **Assessment** (within 24 hours): Determine scope, data affected, root cause
3. **Containment** (within 2 hours): Isolate affected systems, rotate credentials
4. **Notification** (within 48 hours from detection):
   - Regulatory authority (if risk to rights and freedoms)
   - Affected users (if high risk)
   - Content: nature of breach, contact details, likely consequences, measures taken
5. **Documentation**: All steps documented for regulatory review

### Contact for Breach Reports
- Security team: security@dabbu.app
- Data protection officer: dpo@dabbu.app
- Incident response: +91-[phone]

## 5. Third-Party Processors

| Processor | Purpose | Data | Location | Safeguards |
|-----------|---------|------|----------|------------|
| Aiven Cloud | Database hosting | All user data | India | SOC 2, encryption, access controls |
| Render | Application hosting | Ephemeral | US | SOC 2, encryption |
| Firebase (Google) | Push notifications | Device tokens | Global | GDPR DPA, encryption |
| Razorpay | Payment processing | Payment info | India | PCI-DSS, RBI compliant |
| Resend | Email delivery | Email address | US/Global | SOC 2, encryption |
| Sentry | Error monitoring | Error logs | US | DPA, data scrubbing |
| Cloudflare | CDN, DNS | IP addresses | Global | Privacy policy, DPA |
| GitHub | Code hosting | Source code | US | SOC 2, DPA |
| Docker Hub | Container registry | Container images | US | SOC 2 |

## 6. User Rights Summary

| Right | GDPR | CCPA | India DPDP | Implementation |
|-------|------|------|------------|----------------|
| Right to be informed | ✅ | ✅ | ✅ | Privacy policy, cookie consent |
| Right of access | ✅ | ✅ | ✅ | `GET /compliance/gdpr-data` |
| Right to rectification | ✅ | - | ✅ | Profile edit screens |
| Right to erasure | ✅ | ✅ | ✅ | `POST /compliance/delete-account` |
| Right to restrict processing | ✅ | - | ✅ | Settings > Privacy |
| Right to data portability | ✅ | ✅ | ✅ | `GET /compliance/gdpr-data` (JSON) |
| Right to object | ✅ | ✅ | ✅ | Cookie consent opt-out |
| Right to opt-out of sale | - | ✅ | - | Cookie preferences |
| Right to non-discrimination | - | ✅ | - | Policy documented |

## 7. Cookie Consent Categories

| Category | Purpose | Examples | Required |
|----------|---------|----------|----------|
| Essential | App functionality | Auth tokens, session IDs | Yes |
| Functional | User preferences | Theme, language, feature flags | No |
| Analytics | Usage analysis | Screen views, feature usage | No |
| Marketing | Promotions (future) | Push notification opt-in | No |
