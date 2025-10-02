import { NextResponse } from 'next/server';

/**
 * Comprehensive security headers configuration
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy - Prevent XSS and injection attacks
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
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
  
  // Prevent caching of sensitive data
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  // HTTP Strict Transport Security (HSTS) - Force HTTPS
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Permissions Policy - Control browser features
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
    'picture-in-picture=(self)'
  ];
  response.headers.set('Permissions-Policy', permissionsPolicy.join(', '));
  
  // Cross-Origin Embedder Policy
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  
  // Cross-Origin Opener Policy
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  
  // Cross-Origin Resource Policy
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  
  // Remove server information
  response.headers.set('Server', '');
  response.headers.set('X-Powered-By', '');
  
  // CORS headers for API (more restrictive)
  const allowedOrigins = [
    process.env.NEXTAUTH_URL || 'http://localhost:3000',
    process.env.NEXT_PUBLIC_CROWDPUNK_URL || 'https://www.crowdpunk.love'
  ];
  
  const origin = response.headers.get('origin');
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else {
    response.headers.set('Access-Control-Allow-Origin', allowedOrigins[0]);
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-API-Key');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Vary header for proper caching
  response.headers.set('Vary', 'Origin, Accept-Encoding');

  return response;
}

/**
 * Create a secure JSON response with all security headers
 */
export function createSecureResponse(data: Record<string, unknown>, status: number = 200): NextResponse {
  const response = NextResponse.json(data, { status });
  return addSecurityHeaders(response);
}

/**
 * Create a secure error response with all security headers
 */
export function createSecureErrorResponse(message: string, status: number = 500, details?: Record<string, unknown>): NextResponse {
  const errorData = details ? { error: message, ...details } : { error: message };
  const response = NextResponse.json(errorData, { status });
  return addSecurityHeaders(response);
}

/**
 * Create a secure redirect response with security headers
 */
export function createSecureRedirect(url: string, status: number = 302): NextResponse {
  const response = NextResponse.redirect(url, status);
  return addSecurityHeaders(response);
}

/**
 * Add security headers specifically for file uploads/downloads
 */
export function addFileSecurityHeaders(response: NextResponse): NextResponse {
  addSecurityHeaders(response);
  
  // Additional headers for file handling
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  
  return response;
}