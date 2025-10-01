import { NextRequest } from 'next/server';
import { withRateLimit } from '@/app/lib/rate-limiter';
import { createSecureResponse, createSecureErrorResponse } from '@/lib/security-headers';
import { createWalletSession } from '@/app/lib/session-manager';

async function createSessionHandler(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();
    
    if (!walletAddress) {
      return createSecureErrorResponse('Wallet address is required', 400);
    }

    // Validate wallet address format
    if (!walletAddress.startsWith('osmo') || walletAddress.length < 39) {
      return createSecureErrorResponse('Invalid wallet address format', 400);
    }

    // Get client info for session tracking
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create secure session directly with wallet address
    const sessionId = await createWalletSession(walletAddress, ipAddress, userAgent);

    return createSecureResponse({
      success: true,
      sessionId,
      message: 'Session created successfully'
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return createSecureErrorResponse('Internal server error', 500);
  }
}

// Apply rate limiting to the POST endpoint
export const POST = withRateLimit(createSessionHandler, 'auth');