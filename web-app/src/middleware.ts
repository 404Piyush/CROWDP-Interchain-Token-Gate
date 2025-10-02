import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Create response
  const response = NextResponse.next();

  // Comprehensive Security Headers
  
  // Content Security Policy - Enhanced for better security
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https:",
    "connect-src 'self' https://lcd.testnet.osmosis.zone https://rpc.testnet.osmosis.zone https://discord.com https://discordapp.com wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ];
  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking attacks
  response.headers.set('X-Frame-Options', 'DENY');
  
  // XSS Protection (legacy but still useful)
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy - Enhanced to control more browser features
  const permissionsPolicy = [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
    'ambient-light-sensor=()',
    'autoplay=(self)',
    'encrypted-media=(self)',
    'fullscreen=(self)',
    'picture-in-picture=(self)',
    'web-share=(self)'
  ];
  response.headers.set('Permissions-Policy', permissionsPolicy.join(', '));
  
  // Cross-Origin Embedder Policy
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  
  // Cross-Origin Opener Policy
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  
  // Cross-Origin Resource Policy
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  
  // HTTP Strict Transport Security (HSTS) - Force HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Remove server information leakage
  response.headers.set('Server', '');
  response.headers.set('X-Powered-By', '');
  
  // Cache control for security-sensitive pages
  if (request.nextUrl.pathname.startsWith('/auth') || 
      request.nextUrl.pathname.startsWith('/admin') ||
      request.nextUrl.pathname.includes('session')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }
  
  // Additional security for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};