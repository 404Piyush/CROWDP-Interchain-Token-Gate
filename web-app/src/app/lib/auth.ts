import { randomBytes } from 'crypto';
import { NextRequest } from 'next/server';
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
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return { success: false, error: 'API key required' };
  }

  // Check against environment variable for admin API key
  const adminApiKey = process.env.ADMIN_API_KEY;
  if (!adminApiKey) {
    return { success: false, error: 'Admin API key not configured' };
  }

  if (apiKey !== adminApiKey) {
    return { success: false, error: 'Invalid API key' };
  }

  return { success: true };
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
 * Create a user session after successful authentication
 */
export async function createUserSession(walletAddress: string, discordId: string): Promise<string> {
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

  return sessionToken;
}

/**
 * Generate a cryptographically secure token
 */
function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}