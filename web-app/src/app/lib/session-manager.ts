import { randomBytes } from 'crypto';
import { connectToDatabase } from './mongodb';

export interface SessionData {
  sessionId: string;
  walletAddress: string;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Generate a cryptographically secure session ID
 */
function generateSecureSessionId(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create a secure session after wallet ownership proof
 */
export async function createWalletSession(
  walletAddress: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const { db } = await connectToDatabase();
  
  const sessionId = generateSecureSessionId();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes for OAuth flow
  
  const sessionData: SessionData = {
    sessionId,
    walletAddress,
    createdAt: new Date(),
    expiresAt,
    used: false,
    ipAddress,
    userAgent
  };
  
  // Store session in database
  await db.collection('wallet_sessions').insertOne(sessionData);
  
  // Clean up expired sessions
  await db.collection('wallet_sessions').deleteMany({
    expiresAt: { $lt: new Date() }
  });
  
  return sessionId;
}

/**
 * Validate and consume a session (one-time use)
 */
export async function validateAndConsumeSession(sessionId: string): Promise<{
  success: boolean;
  walletAddress?: string;
  error?: string;
}> {
  if (!sessionId || sessionId.length !== 64) {
    return { success: false, error: 'Invalid session ID format' };
  }
  
  const { db } = await connectToDatabase();
  
  // Find valid session
  const session = await db.collection('wallet_sessions').findOne({
    sessionId,
    used: false,
    expiresAt: { $gt: new Date() }
  });
  
  if (!session) {
    return { success: false, error: 'Session not found or expired' };
  }
  
  // Mark session as used (one-time use)
  await db.collection('wallet_sessions').updateOne(
    { _id: session._id },
    { 
      $set: { 
        used: true, 
        usedAt: new Date() 
      } 
    }
  );
  
  return { 
    success: true, 
    walletAddress: session.walletAddress 
  };
}

/**
 * Clean up expired and used sessions (maintenance function)
 */
export async function cleanupExpiredSessions(): Promise<void> {
  const { db } = await connectToDatabase();
  
  // Remove expired sessions
  await db.collection('wallet_sessions').deleteMany({
    expiresAt: { $lt: new Date() }
  });
  
  // Remove used sessions older than 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  await db.collection('wallet_sessions').deleteMany({
    used: true,
    usedAt: { $lt: oneHourAgo }
  });
}

/**
 * Get session info without consuming it (for validation)
 */
export async function getSessionInfo(sessionId: string): Promise<{
  success: boolean;
  walletAddress?: string;
  error?: string;
}> {
  if (!sessionId || sessionId.length !== 64) {
    return { success: false, error: 'Invalid session ID format' };
  }
  
  const { db } = await connectToDatabase();
  
  const session = await db.collection('wallet_sessions').findOne({
    sessionId,
    used: false,
    expiresAt: { $gt: new Date() }
  });
  
  if (!session) {
    return { success: false, error: 'Session not found or expired' };
  }
  
  return { 
    success: true, 
    walletAddress: session.walletAddress 
  };
}