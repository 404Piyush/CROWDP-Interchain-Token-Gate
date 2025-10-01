import { NextRequest } from 'next/server';
import { withRateLimit } from '../../../lib/rate-limiter';
import { createSecureResponse, createSecureErrorResponse } from '@/lib/security-headers';
import { getSessionInfo } from '../../../lib/session-manager';
import { randomBytes } from 'crypto';
import { connectToDatabase } from '../../../lib/mongodb';

async function discordAuthHandler(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return createSecureErrorResponse('Session ID is required', 400);
    }

    // Validate session and get wallet address
    const sessionResult = await getSessionInfo(sessionId);
    if (!sessionResult.success || !sessionResult.walletAddress) {
      return createSecureErrorResponse('Invalid or expired session', 401);
    }

    const walletAddress = sessionResult.walletAddress;
    const { db } = await connectToDatabase();

    // Generate cryptographically secure state for CSRF protection
    const state = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store state in database linked to session (NO wallet address in URL)
    await db.collection('oauth_states').insertOne({
      state,
      sessionId,
      walletAddress, // Stored securely in database only
      expiresAt,
      createdAt: new Date(),
      used: false
    });

    // Clean up expired states
    await db.collection('oauth_states').deleteMany({
      expiresAt: { $lt: new Date() }
    });

    // Generate Discord OAuth URL with PKCE
    const discordClientId = process.env.DISCORD_CLIENT_ID;
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const redirectUri = encodeURIComponent(`${baseUrl}/api/auth/discord/callback`);
    
    // Generate PKCE code verifier and challenge
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = Buffer.from(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))
    ).toString('base64url');

    // Store PKCE verifier with state
    await db.collection('oauth_states').updateOne(
      { state },
      { $set: { codeVerifier } }
    );
    
    // SECURE: Only state token in URL, wallet address stays in database
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${discordClientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify+guilds&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    return createSecureResponse({
      success: true,
      discordAuthUrl
    });
  } catch (error) {
    console.error('Error creating Discord auth URL:', error);
    return createSecureErrorResponse('Internal server error', 500);
  }
}

// Apply rate limiting to the POST endpoint
export const POST = withRateLimit(discordAuthHandler, 'auth');