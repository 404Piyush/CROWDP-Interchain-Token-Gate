import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from './mongodb';

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: {
    walletAddress: string;
    discordId: string;
    discordUsername: string;
    isAdmin?: boolean;
  };
}

/**
 * Verify API key for admin operations
 */
export async function verifyApiKey(request: NextRequest): Promise<AuthResult> {
  const apiKey = request.headers.get('x-api-key');
  const expectedApiKey = process.env.ADMIN_API_KEY;

  if (!apiKey || !expectedApiKey) {
    return { success: false, error: 'API key required' };
  }

  if (apiKey !== expectedApiKey) {
    return { success: false, error: 'Invalid API key' };
  }

  return {
    success: true,
    user: {
      walletAddress: 'admin',
      discordId: 'admin',
      discordUsername: 'Admin User',
      isAdmin: true
    }
  };
}

/**
 * Verify user session for authenticated operations
 */
export async function verifyUserSession(request: NextRequest): Promise<AuthResult> {
  try {
    const sessionToken = request.headers.get('x-session-token') || 
                        request.cookies.get('session-token')?.value;
    
    if (!sessionToken) {
      return { success: false, error: 'Session token required' };
    }

    const { db } = await connectToDatabase();
    
    // Find active user session
    const session = await db.collection('user_sessions').findOne({
      sessionToken,
      expiresAt: { $gt: new Date() },
      active: true
    });

    if (!session) {
      return { success: false, error: 'Invalid or expired session' };
    }

    // Get user details
    const user = await db.collection('users').findOne({
      walletAddress: session.walletAddress
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return {
      success: true,
      user: {
        walletAddress: user.walletAddress,
        discordId: user.discordId,
        discordUsername: user.discordUsername,
        isAdmin: user.isAdmin || false
      }
    };
  } catch (error) {
    console.error('Session verification error:', error);
    return { success: false, error: 'Session verification failed' };
  }
}

/**
 * Verify admin privileges (either API key or admin user session)
 */
export async function verifyAdminAccess(request: NextRequest): Promise<AuthResult> {
  // First try API key authentication
  const apiKeyResult = await verifyApiKey(request);
  if (apiKeyResult.success) {
    return apiKeyResult;
  }

  // Then try user session with admin privileges
  const sessionResult = await verifyUserSession(request);
  if (sessionResult.success && sessionResult.user?.isAdmin) {
    return sessionResult;
  }

  return { success: false, error: 'Admin access required' };
}

/**
 * Create a user session after successful authentication with secure cookie settings
 */
export async function createUserSession(walletAddress: string, discordId: string): Promise<{
  sessionToken: string;
  response: NextResponse;
}> {
  const { db } = await connectToDatabase();
  
  const sessionToken = generateSecureToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  await db.collection('user_sessions').insertOne({
    sessionToken,
    walletAddress,
    discordId,
    expiresAt,
    createdAt: new Date(),
    active: true
  });

  // Create response with secure cookie
  const response = NextResponse.json({
    success: true,
    message: 'Session created successfully'
  });

  // Set secure session cookie
  setSecureSessionCookie(response, sessionToken, expiresAt);

  return { sessionToken, response };
}

/**
 * Set secure session cookie with proper security attributes
 */
export function setSecureSessionCookie(response: NextResponse, sessionToken: string, expiresAt: Date): void {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Set secure cookie with all security attributes
  response.cookies.set('session-token', sessionToken, {
    httpOnly: true,           // Prevent XSS attacks
    secure: isProduction,     // HTTPS only in production
    sameSite: 'strict',       // CSRF protection
    expires: expiresAt,       // Explicit expiration
    path: '/',                // Available site-wide
    priority: 'high'          // High priority cookie
  });

  // Set additional security headers for session endpoints
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
}

/**
 * Clear session cookie securely
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set('session-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0), // Expire immediately
    path: '/',
    priority: 'high'
  });
}

/**
 * Invalidate user session
 */
export async function invalidateUserSession(sessionToken: string): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();
    
    const result = await db.collection('user_sessions').updateOne(
      { sessionToken },
      { 
        $set: { 
          active: false, 
          invalidatedAt: new Date() 
        } 
      }
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Session invalidation error:', error);
    return false;
  }
}

/**
 * Clean up expired sessions (maintenance function)
 */
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    
    // Remove expired sessions
    await db.collection('user_sessions').deleteMany({
      expiresAt: { $lt: new Date() }
    });

    // Remove inactive sessions older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await db.collection('user_sessions').deleteMany({
      active: false,
      invalidatedAt: { $lt: sevenDaysAgo }
    });
  } catch (error) {
    console.error('Session cleanup error:', error);
  }
}

/**
 * Generate a cryptographically secure token
 */
function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}