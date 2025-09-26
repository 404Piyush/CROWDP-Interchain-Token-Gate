import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, roleId } = await request.json();

    if (!walletAddress || !roleId) {
      return NextResponse.json(
        { message: 'Wallet address and role ID are required' },
        { status: 400 }
      );
    }

    // Call Discord bot to assign the test role
    const discordResponse = await fetch('http://localhost:8000/assign-test-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wallet_address: walletAddress,
        role_id: roleId
      }),
    });

    if (!discordResponse.ok) {
      const errorData = await discordResponse.json();
      return NextResponse.json(
        { message: errorData.detail || 'Failed to assign test role' },
        { status: discordResponse.status }
      );
    }

    const result = await discordResponse.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in test-role API:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}