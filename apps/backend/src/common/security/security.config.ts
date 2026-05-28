import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import helmet from 'helmet';
import * as rateLimit from 'express-rate-limit';

@Injectable()
export class SecurityConfig implements OnModuleInit {
  private readonly logger = new Logger(SecurityConfig.name);

  onModuleInit(): void {
    this.logger.log('Security configuration initialized');
  }

  getHelmetConfig() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          connectSrc: ["'self'", 'https://api.stripe.com', 'https://api.razorpay.com'],
          frameSrc: ["'self'", 'https://js.stripe.com'],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginEmbedderPolicy: false,
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      ieNoOpen: true,
      noSniff: true,
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true,
    });
  }

  getRateLimiterConfig() {
    return rateLimit.default({
      windowMs: 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests, please try again later.' },
    });
  }

  getAuthRateLimiterConfig() {
    return rateLimit.default({
      windowMs: 15 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many login attempts, please try again later.' },
    });
  }
}
