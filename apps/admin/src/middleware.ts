import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/login'];

const roleHierarchy: Record<string, number> = {
  super_admin: 100,
  admin: 80,
  support: 60,
  analyst: 40,
};

const routeMinRole: Record<string, string> = {
  '/admins': 'super_admin',
  '/settings': 'admin',
  '/feature-flags': 'admin',
  '/coupons': 'admin',
  '/notifications': 'admin',
};

function decodeToken(token: string): { role?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch { return null; }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value;
  const pathname = request.nextUrl.pathname;

  if (publicPaths.includes(pathname)) {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based route protection
  const payload = decodeToken(token);
  const userRole = payload?.role || '';
  const userLevel = roleHierarchy[userRole] || 0;

  for (const [route, minRole] of Object.entries(routeMinRole)) {
    if (pathname.startsWith(route)) {
      const requiredLevel = roleHierarchy[minRole] || 0;
      if (userLevel < requiredLevel) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
