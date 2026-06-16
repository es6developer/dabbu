import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from './cache.service';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(private readonly cache: CacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    if (request.method !== 'GET') return next.handle();

    if (!request.user?.id) return next.handle();

    const cacheKey = this.cache.buildKey(request.route?.path || request.url, request.user.id, request.query);
    const cached = this.cache.get(cacheKey);
    if (cached !== null) {
      response.setHeader('X-Cache', 'HIT');
      return of(cached);
    }

    response.setHeader('X-Cache', 'MISS');
    return next.handle().pipe(
      tap((data) => {
        const ttl = this.resolveTtl(request.route?.path || request.url);
        this.cache.set(cacheKey, data, ttl);
      }),
    );
  }

  private resolveTtl(path: string): number {
    if (path.includes('/health')) return 10_000;
    if (path.includes('/stats') || path.includes('/summary')) return 60_000;
    if (path.includes('/search') || path.includes('/recent')) return 15_000;
    return 30_000;
  }
}
