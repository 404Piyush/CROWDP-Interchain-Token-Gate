import { NextRequest } from 'next/server';
import { withRateLimit } from '../../../lib/rate-limiter';
import { createSecureResponse, createSecureErrorResponse } from '@/lib/security-headers';

async function discordAuthHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    
    if (!walletAddress) {
      return createSecureErrorResponse('Wallet address is required', 400);
    }

    // Validate wallet address format (basic Cosmos bech32 validation)
    if (!walletAddress.startsWith('osmo') || walletAddress.length < 39) {
      return createSecureErrorResponse('Invalid wallet address format', 400);
    }

    // Generate Discord OAuth URL directly
    const discordClientId = process.env.DISCORD_CLIENT_ID;
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const redirectUri = encodeURIComponent(`${baseUrl}/api/auth/discord/callback`);
    const state = encodeURIComponent(JSON.stringify({ walletAddress }));
    
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${discordClientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify&state=${state}`;

    return createSecureResponse({
      success: true,
      discordAuthUrl
    });
  } catch (error) {
    console.error('Error creating Discord auth URL:', error);
    return createSecureErrorResponse('Internal server error', 500);
  }
}

// Apply rate limiting to the GET endpoint
export const GET = withRateLimit(discordAuthHandler, 'auth');