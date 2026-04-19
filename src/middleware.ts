import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/jwt';

// --- CONFIGURATION DU RATE LIMITING ---
// Pour un SaaS auto-hébergé, on utilise un cache en mémoire simple.
// Note: En production multi-instance, il faudrait utiliser Redis.
const rateLimitMap = new Map<string, { count: number; lastRequest: number }>();

function isRateLimited(ip: string) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxAttempts = 5;

  const record = rateLimitMap.get(ip);
  if (!record) {
    rateLimitMap.set(ip, { count: 1, lastRequest: now });
    return false;
  }

  if (now - record.lastRequest > windowMs) {
    record.count = 1;
    record.lastRequest = now;
    return false;
  }

  record.count++;
  if (record.count > maxAttempts) {
    return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';

  // 1. PROTECTION BRUTE-FORCE SUR LE LOGIN
  if (pathname.includes('/login') && request.method === 'POST') {
    if (isRateLimited(ip)) {
      return new NextResponse(
        JSON.stringify({ success: false, error: "Trop de tentatives. Réessayez dans 1 minute." }),
        { status: 429, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  // 2. PROTECTION DES ROUTES PRIVÉES (JWT)
  const privateRoutes = ['/manager', '/cuisine', '/caisse', '/super-admin'];
  const isPrivateRoute = privateRoutes.some(route => pathname.startsWith(route));

  if (isPrivateRoute) {
    const session = request.cookies.get('session')?.value;
    const adminSession = request.cookies.get('admin_session')?.value;

    const payload = session ? await decrypt(session) : null;
    const adminPayload = adminSession ? await decrypt(adminSession) : null;

    if (!payload && !adminPayload && !pathname.endsWith('/login')) {
      // Rediriger vers le login approprié
      if (pathname.startsWith('/super-admin')) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL('/manager/login', request.url));
    }

    // Protection par rôle
    if (pathname.startsWith('/super-admin')) {
       if (!adminPayload || adminPayload.role !== 'SUPER_ADMIN') {
         return NextResponse.next(); // La page gère l'affichage du login
       }
    } else if (payload) {
       if (pathname.startsWith('/manager') && payload.role !== 'MANAGER' && !pathname.endsWith('/login')) {
          return NextResponse.redirect(new URL('/manager/login', request.url));
       }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/manager/:path*',
    '/cuisine/:path*',
    '/caisse/:path*',
    '/super-admin/:path*',
  ],
};
