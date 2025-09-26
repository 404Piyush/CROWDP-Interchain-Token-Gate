import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  if (!code || !state) {
    return NextResponse.redirect(new URL('/?error=missing_params', request.url));
  }

  try {
    // Parse state to get wallet address
    const { walletAddress } = JSON.parse(decodeURIComponent(state));
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/discord/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    
    // Get user info from Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const discordUser = await userResponse.json();
    
    // Save user to database
    const { db } = await connectToDatabase();
    
    // Get existing user to preserve OSMO balance if it exists
    const existingUser = await db.collection('users').findOne({ walletAddress });
    const osmoBalance = existingUser?.osmoBalance || 0;
    
    await db.collection('users').updateOne(
      { walletAddress },
      {
        $set: {
          walletAddress,
          discordId: discordUser.id,
          discordUsername: discordUser.username,
          discordDiscriminator: discordUser.discriminator,
          discordAvatar: discordUser.avatar,
          connectedAt: new Date(),
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          osmoBalance, // Initialize or preserve OSMO balance
          currentRole: null, // Will be calculated when balance is updated
          eligibleRoles: [],
          lastRoleUpdate: new Date()
        },
      },
      { upsert: true }
    );

    // Add user to Discord server (if guild ID is configured)
    if (process.env.DISCORD_GUILD_ID) {
      try {
        await fetch(`https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordUser.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: tokenData.access_token,
          }),
        });
      } catch (error) {
        console.error('Failed to add user to guild:', error);
        // Don't fail the entire process if guild join fails
      }
    }

    // Redirect back to Discord server or success page
    const discordInviteUrl = process.env.DISCORD_INVITE_URL || 'https://discord.gg/your-server';
    return NextResponse.redirect(discordInviteUrl);
    
  } catch (error) {
    console.error('Discord OAuth error:', error);
    return NextResponse.redirect(new URL('/?error=oauth_failed', request.url));
  }
}