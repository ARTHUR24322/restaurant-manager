import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/jwt';

// --- CONFIGURATION DU RATE LIMITING ---
const rateLimitMap = new Map<string, { count: number; lastRequest: number }>();

// SÉCURITÉ : Nettoyage périodique pour éviter la fuite mémoire
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
let lastCleanup = Date.now();

function cleanupRateLimitMap() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  
  const windowMs = 60 * 1000;
  for (const [ip, record] of Array.from(rateLimitMap.entries())) {
    if (now - record.lastRequest > windowMs * 2) {
      rateLimitMap.delete(ip);
    }
  }
  
  // Sécurité : limite absolue de la Map pour éviter les abus
  if (rateLimitMap.size > 10000) {
    rateLimitMap.clear();
  }
}

function isRateLimited(ip: string) {
  cleanupRateLimitMap();
  
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
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'anonymous';

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
  const privateRoutes = ['/manager', '/cuisine', '/caisse', '/mokolositekisumbule'];
  const isPrivateRoute = privateRoutes.some(route => pathname.startsWith(route));

  if (isPrivateRoute) {
    const session = request.cookies.get('session')?.value;
    const adminSession = request.cookies.get('admin_session')?.value;

    let payload = null;
    let adminPayload = null;

    if (adminSession) adminPayload = await decrypt(adminSession);
    if (!adminPayload && session) payload = await decrypt(session);

    // --- FORCER LA DÉSACTIVATION DU CACHE SUR TOUTES LES ROUTES PRIVÉES ---
    const headers = new Headers(request.headers);
    const response = NextResponse.next({
      request: {
        headers: headers,
      },
    });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    // SÉCURITÉ : Headers supplémentaires
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    if (!payload && !adminPayload && !pathname.endsWith('/login')) {
      // Rediriger vers le login approprié
      if (pathname.startsWith('/mokolositekisumbule')) {
        return response;
      }
      const redirectRes = NextResponse.redirect(new URL('/manager/login', request.url));
      redirectRes.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      return redirectRes;
    }

    // Protection par rôle — TOUS les rôles vérifiés
    if (pathname.startsWith('/mokolositekisumbule')) {
       if (!adminPayload || adminPayload.role !== 'SUPER_ADMIN') {
         return response; // La page gère l'affichage du login
       }
    } else if (pathname.startsWith('/manager') && !pathname.endsWith('/login')) {
       if (!payload || (payload.role !== 'MANAGER' && payload.role !== 'SUPER_ADMIN')) {
          const managerRedirect = NextResponse.redirect(new URL('/manager/login', request.url));
          managerRedirect.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
          return managerRedirect;
       }
    } else if (pathname.startsWith('/cuisine') && !pathname.endsWith('/login')) {
       // SÉCURITÉ E3 : La cuisine nécessite une session valide (MANAGER ou SUPER_ADMIN)
       if (!payload || (payload.role !== 'MANAGER' && payload.role !== 'SUPER_ADMIN')) {
          const cuisineRedirect = NextResponse.redirect(new URL('/manager/login', request.url));
          cuisineRedirect.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
          return cuisineRedirect;
       }
    } else if (pathname.startsWith('/caisse') && !pathname.endsWith('/login')) {
       // SÉCURITÉ E3 : La caisse nécessite une session valide (MANAGER ou SUPER_ADMIN)
       if (!payload || (payload.role !== 'MANAGER' && payload.role !== 'SUPER_ADMIN')) {
          const caisseRedirect = NextResponse.redirect(new URL('/manager/login', request.url));
          caisseRedirect.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
          return caisseRedirect;
       }
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/manager/:path*',
    '/cuisine/:path*',
    '/caisse/:path*',
    '/mokolositekisumbule/:path*',
  ],
};
