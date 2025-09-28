import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import { withRateLimit } from '../../../lib/rate-limiter';
import { createSecureResponse, createSecureErrorResponse } from '@/lib/security-headers';

async function checkUserHandler(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();
    
    if (!walletAddress) {
      return createSecureErrorResponse('Wallet address is required', 400);
    }

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ walletAddress });
    
    return createSecureResponse({ exists: !!user });
  } catch (error) {
    console.error('Error checking user:', error);
    return createSecureErrorResponse('Internal server error', 500);
  }
}

// Apply rate limiting to the POST endpoint
export const POST = withRateLimit(checkUserHandler, 'default');