import { NextRequest } from 'next/server';
import { withRateLimit } from '@/app/lib/rate-limiter';
import { createSecureResponse, createSecureErrorResponse } from '@/lib/security-headers';
import { invalidateUserSession, clearSessionCookie } from '@/app/lib/auth';

async function logoutHandler(request: NextRequest) {
  try {
    const sessionToken = request.headers.get('x-session-token') || 
                        request.cookies.get('session-token')?.value;
    
    if (!sessionToken) {
      return createSecureErrorResponse('No active session found', 400);
    }

    // Invalidate the session in the database
    const invalidated = await invalidateUserSession(sessionToken);
    
    if (!invalidated) {
      return createSecureErrorResponse('Session not found or already invalidated', 404);
    }

    // Create response and clear the session cookie
    const response = createSecureResponse({
      success: true,
      message: 'Logged out successfully'
    });

    clearSessionCookie(response);

    return response;
  } catch (error) {
    console.error('Error during logout:', error);
    return createSecureErrorResponse('Internal server error', 500);
  }
}

// Apply rate limiting to the POST endpoint
export const POST = withRateLimit(logoutHandler, 'auth');