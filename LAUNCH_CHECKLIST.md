# Dabbu Production Launch Checklist

## Pre-Launch (T-14 Days)

### Security Verification
- [ ] JWT secret rotation - use strong 256-bit key
- [ ] Review all environment variables are properly set
- [ ] Verify rate limiting is enabled in production
- [ ] Confirm CORS whitelist includes only production domains
- [ ] Test brute force protection with automated testing
- [ ] Verify webhook signature verification on Razorpay
- [ ] Confirm document encryption keys are properly managed
- [ ] Run `npm audit` and fix all vulnerabilities
- [ ] Enable Helmet CSP headers for production
- [ ] Session timeout configured correctly
- [ ] Admin MFA/2FA enabled for super_admin accounts
- [ ] Admin auth switched to httpOnly cookies (not localStorage)
- [ ] Client-side RBAC implemented (hide destructive UI per role)
- [ ] Login alert emails sent on new device detection
- [ ] Rate limiting configured on file upload endpoints
- [ ] Presigned URLs for S3/R2 file access instead of public URLs

### Database Preparation
- [ ] Run all Prisma migrations
- [ ] Create production database indexes
- [ ] Set up automated daily backups
- [ ] Configure connection pooling
- [ ] Enable slow query logging
- [ ] Set up read replica (if needed for scale)
- [ ] Verify soft delete on all relevant models
- [ ] Data retention policy applied to old analytics events

### Infrastructure
- [ ] Docker production images built and pushed to registry
- [ ] SSL certificates configured (Let's Encrypt / Traefik)
- [ ] Load balancer configured (Traefik reverse proxy)
- [ ] Redis configured with password and persistence
- [ ] MySQL configured with proper memory limits
- [ ] CDN configured for static assets
- [ ] Domain DNS records verified (api.dabbu.app, admin.dabbu.app, app.dabbu.app)
- [ ] Health check endpoints responding correctly

### Monitoring & Alerting
- [ ] Sentry DSN configured for backend
- [ ] Sentry DSN configured for mobile app (@sentry/react-native)
- [ ] Sentry DSN configured for admin panel (@sentry/nextjs)
- [ ] OpenTelemetry exporter configured
- [ ] Uptime monitoring configured (Pingdom / UptimeRobot)
- [ ] Alert rules configured for:
  - [ ] Error rate > 1%
  - [ ] API p95 latency > 500ms
  - [ ] Database connection pool exhaustion
  - [ ] Disk space < 10%
  - [ ] SSL certificate expiry < 30 days
- [ ] PagerDuty/OpsGenie on-call rotation configured
- [ ] Log aggregation (ELK / Datadog) configured
- [ ] Load testing completed (k6/artillery at 2x expected load)
- [ ] MySQL slow query log enabled
- [ ] Prisma connection pool size tuned

## Launch Day (T-0)

### Pre-Launch Checklist
- [ ] Final production deployment completed
- [ ] Database migration run successfully
- [ ] Seed data populated (plans, default categories, badges)
- [ ] Admin accounts created
- [ ] Smoke tests passed
- [ ] Health check: database, redis, memory, disk all green
- [ ] Sentry error rate at 0 for 30 minutes post-deploy
- [ ] Push notifications test (test device)
- [ ] Email delivery test
- [ ] Payment gateway test (Razorpay test mode)
- [ ] API response times < 300ms p95
- [ ] Mobile app cold start < 2 seconds

### Rollback Plan
- [ ] Docker image tagged with version
- [ ] Previous stable image tagged as `stable`
- [ ] Database migration reversible
- [ ] Feature flags allow disabling new features instantly
- [ ] `docker compose -f docker-compose.prod.yml up -d` with previous tag

### Post-Launch Monitoring (First 24 Hours)
- [ ] Monitor Sentry error rate every 15 minutes
- [ ] Monitor API latency (target < 300ms)
- [ ] Monitor database connection pool usage
- [ ] Monitor Redis memory usage
- [ ] Monitor user signup flow end-to-end
- [ ] Monitor payment flow end-to-end
- [ ] Check push notification delivery rate > 95%
- [ ] Check email delivery rate > 98%
- [ ] Verify all cron jobs execute on schedule
- [ ] Monitor disk space on database server

## Post-Launch (T+1 to T+30)

### Week 1
- [ ] Review Sentry errors and fix top issues
- [ ] Monitor user onboarding completion rate
- [ ] Check premium conversion funnel
- [ ] Analyze first-week user retention
- [ ] Review API usage patterns for optimization

### Week 2
- [ ] Review database performance with real traffic
- [ ] Add missing database indexes based on slow query log
- [ ] Tune Redis cache TTLs
- [ ] Review notification delivery analytics
- [ ] A/B test notification timing

### Week 4
- [ ] Full security audit
- [ ] Performance optimization pass
- [ ] Feature usage analytics review
- [ ] Churn analysis and re-engagement strategy
- [ ] Roadmap planning based on user behavior

## Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| API Response Time (p95) | < 300ms | - | 📊 |
| API Response Time (p99) | < 1s | - | 📊 |
| Mobile Cold Start | < 2s | - | 📊 |
| Mobile Screen Load | < 500ms | - | 📊 |
| UI Frame Rate | 60 FPS | - | 📊 |
| Database Query Time (p95) | < 100ms | - | 📊 |
| Push Notification Delivery | > 95% | - | 📊 |
| Email Delivery Rate | > 98% | - | 📊 |
| Uptime (Monthly) | > 99.9% | - | 📊 |
| Error Rate | < 0.1% | - | 📊 |

## Security Compliance Checklist

### Data Protection
- [ ] GDPR compliance documentation completed
- [ ] Data Processing Agreement (DPA) available
- [ ] Privacy Policy published at /privacy
- [ ] Terms of Service published at /terms
- [ ] Cookie Consent implemented on marketing site
- [ ] Data retention policy documented
- [ ] User data export API functional
- [ ] Account deletion API functional
- [ ] Data breach notification procedure documented

### Indian Compliance (IT Act 2000)
- [ ] Reasonable security practices implemented (ISO 27001 aligned)
- [ ] Data localization requirements met (data stored in India)
- [ ] Grievance officer contact published
- [ ] SSL/TLS encryption for all data in transit
- [ ] Audit trail for all financial transactions
- [ ] KYC compliance for payment gateway integration

### Payment Security
- [ ] PCI DSS compliance (handled by Razorpay)
- [ ] Razorpay webhook signature verification
- [ ] Payment reconciliation procedure
- [ ] Refund policy documented
- [ ] Subscription cancellation flow tested

## Testing Checklist

### Backend Tests
- [ ] Unit tests pass (`npm test`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] All 45+ API modules load correctly
- [ ] Authentication flow (register, login, refresh, logout)
- [ ] Payment flow (create subscription, webhook, renewal)
- [ ] Shared finance flow (create group, add expense, settle)
- [ ] Export flow (JSON, PDF, Excel)
- [ ] Notification flow (push, email, in-app)
- [ ] Document upload flow
- [ ] Search flow

### Mobile Tests (iOS + Android)
- [ ] Onboarding flow complete
- [ ] Auth flow (email, Google SSO)
- [ ] Transaction creation and editing
- [ ] Goal creation and progress tracking
- [ ] Budget setup and monitoring
- [ ] Shared finance group management
- [ ] Couple mode connection
- [ ] Push notification permissions and delivery
- [ ] Offline mode
- [ ] Biometric authentication
- [ ] App lock PIN
- [ ] Deep linking
- [ ] All navigation flows
- [ ] Premium subscription flow
- [ ] @sentry/react-native crash reporting verified
- [ ] Hermes engine enabled for production builds
- [ ] Bundle size analyzed and optimized
- [ ] Mobile API cache behavior verified

## App Store Checklist

### iOS (App Store)
- [ ] App Store Connect record created
- [ ] App icon (all sizes)
- [ ] Screenshots (6.5", 5.5", 12.9")
- [ ] App preview video
- [ ] Description, keywords, promotional text
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] Marketing URL
- [ ] Age rating (4+)
- [ ] Content rights
- [ ] Export compliance information
- [ ] App Review information
- [ ] TestFlight beta testing completed
- [ ] In-app purchases configured (subscriptions)

### Android (Play Store)
- [ ] Google Play Console listing created
- [ ] App icon (all sizes)
- [ ] Feature graphic, screenshots
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars)
- [ ] Privacy policy URL
- [ ] App category (Finance)
- [ ] Content rating questionnaire completed
- [ ] App signing
- [ ] Internal test track completed
- [ ] Closed/Open test track completed
- [ ] In-app products configured (subscriptions)
- [ ] Data Safety section completed

## Launch Day Runbook

```
1. 08:00 - Final code freeze
2. 08:30 - Build production Docker images
3. 09:00 - Run database migrations
4. 09:15 - Deploy backend to production
5. 09:30 - Run smoke tests against production
6. 09:45 - Deploy admin panel
7. 10:00 - Enable feature flags for new users
8. 10:15 - Monitor error rates (target: 0)
9. 10:30 - Open signups to 10% of waitlist
10. 11:00 - Monitor and scale as needed
11. 12:00 - Full launch
12. 16:00 - Post-launch review
```

## Emergency Contacts

| Role | Contact |
|------|---------|
| Lead Developer | [Name] - [Phone] |
| Backend Engineer | [Name] - [Phone] |
| DevOps Engineer | [Name] - [Phone] |
| Database Admin | [Name] - [Phone] |
| Security Lead | [Name] - [Phone] |
| Product Manager | [Name] - [Phone] |
| Customer Support | [Name] - [Phone] |

## Post-Launch Monitoring Dashboard

### Critical Metrics (Real-time)
- Active users (current)
- Error rate (last 5 min)
- API p95 latency
- Database connections
- Payment success rate
- Push notification delivery rate

### Business Metrics (Daily)
- New registrations
- DAU / MAU
- Premium conversion rate
- Revenue (daily MRR)
- Churn rate
- Retention (D1, D7, D30)
- Support ticket volume
- Average response time

### Technical Metrics (Hourly)
- CPU / Memory / Disk usage
- API endpoint usage (top 10)
- Database slow queries
- Redis memory usage
- Queue depth (BullMQ)
- CDN bandwidth
- Error types (Sentry)
