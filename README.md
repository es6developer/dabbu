# Dabbu - Personal Finance Manager

A production-ready personal finance management platform with shared finance, AI insights, family budgeting, and more.

## Architecture

```
dabbu/
├── apps/
│   ├── backend/      # NestJS REST API (Prisma + MySQL + Redis)
│   ├── mobile/       # Expo React Native app (iOS + Android)
│   ├── admin/        # Next.js Admin Dashboard
│   ├── external-web/ # Next.js PWA for sharing
│   └── web/          # Marketing website
├── packages/
│   ├── ai-engine/    # Rule-based AI engines (31 engines)
│   └── shared-types/ # Shared TypeScript types
└── docker/           # Infrastructure configs
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | NestJS + Prisma | ^10.3 / ^5.22 |
| Database | MySQL 8.0 | 8.0 |
| Cache/Queue | Redis + BullMQ | 7-alpine |
| Mobile | Expo SDK 50 (RN 0.73) | ~50.0.0 |
| Admin | Next.js 14 + shadcn/ui | ^14.1.0 |
| AI | Rule-based (31 engines) | Custom |
| Monitoring | Sentry + OpenTelemetry | Latest |
| CI/CD | GitHub Actions + Docker | - |

## Quick Start

### Prerequisites
- Node.js 20+
- npm 10+
- Docker (for MySQL + Redis)
- Expo CLI (`npm install -g expo-cli`)

### Development

```bash
# 1. Clone and install
npm install

# 2. Start infrastructure
docker compose up -d

# 3. Setup database
npm run db:migrate:dev
npm run db:seed

# 4. Start development
npm run dev
```

### Environment Setup
Copy `.env.production` to `apps/backend/.env` and configure:

```env
DATABASE_URL=mysql://root:password@localhost:3307/dabbu
REDIS_HOST=localhost
REDIS_PORT=6380
JWT_SECRET=your-secret-key
```

## Production Deployment

### Docker Deployment
```bash
docker compose -f docker-compose.prod.yml up -d
```

### Database Migrations
```bash
npm run db:migrate:prod
```

### Health Check
```bash
curl https://api.dabbu.app/api/v1/health
```

## Features

### Core Finance
- Multi-account management (7 types)
- Transaction management with OCR receipt scanning
- Hierarchical categories (income/expense)
- Budget tracking with alerts
- Bill management with reminders
- Financial goals (8 types)
- Investment portfolio (6 types)

### Shared Finance (Spaces)
- Group expense splitting (6 split types)
- Settlement system with UPI deep links
- Group wallets with multi-wallet support
- Credit card bill splitting
- Trip expense tracking
- Household bill management
- Document vault with encryption

### AI & Intelligence
- 31 rule-based AI engines
- Financial health scoring (0-100)
- Anomaly detection
- Spending predictions & forecasts
- Goal achievement predictions
- Smart notification prioritization

### Social Features
- Couple finance management
- Family groups with shared goals
- Friend discovery via contact hashing
- Real-time chat (Socket.io)
- Referral program

### Security
- JWT + refresh token rotation
- Biometric authentication
- App lock PIN
- Rate limiting (dual-layer)
- Document encryption (AES-256-CBC)
- Razorpay webhook verification
- Brute force protection
- Session management

## API Documentation
```
https://api.dabbu.app/api/v1/docs
```

## Monitoring
- Sentry error tracking
- OpenTelemetry traces
- Health endpoints: `/health`, `/health/ready`, `/health/live`
- Admin dashboard: `https://admin.dabbu.app`

## License
MIT
