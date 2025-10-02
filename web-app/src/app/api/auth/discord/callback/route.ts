import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb';
import { withRateLimit } from '../../../../lib/rate-limiter';
import { createSecureErrorResponse } from '@/lib/security-headers';
import { validateAndConsumeSession } from '../../../../lib/session-manager';
import { createUserSession } from '../../../../lib/auth';

async function discordCallbackHandler(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}?error=missing_params`);
  }

  try {
    const { db } = await connectToDatabase();
    
    // Verify state and get associated session
    const stateDoc = await db.collection('oauth_states').findOne({
      state,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!stateDoc) {
      console.error('Invalid or expired OAuth state');
      return NextResponse.redirect(`${baseUrl}?error=invalid_state`);
    }

    // Mark state as used
    await db.collection('oauth_states').updateOne(
      { _id: stateDoc._id },
      { $set: { used: true, usedAt: new Date() } }
    );

    // Validate and consume the session token (one-time use)
    const sessionResult = await validateAndConsumeSession(stateDoc.sessionId);
    if (!sessionResult.success || !sessionResult.walletAddress) {
      console.error('Invalid session during OAuth callback');
      return NextResponse.redirect(`${baseUrl}?error=invalid_session`);
    }

    const walletAddress = sessionResult.walletAddress;
    const codeVerifier = stateDoc.codeVerifier;
    
    // Exchange code for token with PKCE
    const discordApiUrl = process.env.DISCORD_API_BASE_URL || 'https://discord.com/api';
    const tokenResponse = await fetch(`${discordApiUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${baseUrl}/api/auth/discord/callback`,
        code_verifier: codeVerifier
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    
    // Get user info
    const userResponse = await fetch(`${discordApiUrl}/users/@me`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const discordUser = await userResponse.json();
    
    // Fetch current OSMO balance from blockchain instead of using cached value
    let osmoBalance = 0;
    try {
      const cosmosRestUrl = process.env.COSMOS_REST_URL || 'https://lcd.testnet.osmosis.zone';
      const response = await fetch(`${cosmosRestUrl}/cosmos/bank/v1beta1/balances/${walletAddress}`);
      const data = await response.json();
      
      const osmoBalanceData = data.balances?.find((b: { denom: string; amount: string }) => b.denom === 'uosmo');
      if (osmoBalanceData) {
        osmoBalance = parseInt(osmoBalanceData.amount) / 1000000; // Convert from uosmo to OSMO
      }
    } catch (error) {
      console.error('Failed to fetch current balance from blockchain:', error);
      // Fallback to existing balance if blockchain query fails
      const existingUser = await db.collection('users').findOne({ walletAddress });
      osmoBalance = existingUser?.osmoBalance || 0;
    }
    
    // Calculate roles based on current balance
    const { calculateUserRole } = await import('@/app/lib/roles');
    const roleInfo = await calculateUserRole(osmoBalance);
    
    // Encrypt Discord tokens before storing
    const { encryptDiscordTokens } = await import('@/app/lib/encryption');
    const { encryptedAccessToken, encryptedRefreshToken } = encryptDiscordTokens(
      tokenData.access_token,
      tokenData.refresh_token
    );
    
    // Check if wallet is already linked to a different Discord account
    const existingWalletUser = await db.collection('users').findOne({ walletAddress });
    if (existingWalletUser && existingWalletUser.discordId && existingWalletUser.discordId !== discordUser.id) {
      return createSecureErrorResponse(
        `This wallet is already linked to Discord user ${existingWalletUser.discordUsername}. Only one Discord account can be connected to each wallet.`,
        400
      );
    }

    // Check if Discord account is already linked to a different wallet
    const existingDiscordUser = await db.collection('users').findOne({ discordId: discordUser.id });
    if (existingDiscordUser && existingDiscordUser.walletAddress && existingDiscordUser.walletAddress !== walletAddress) {
      return createSecureErrorResponse(
        `Your Discord account is already linked to wallet ${existingDiscordUser.walletAddress}. Please unlink first if you want to connect a different wallet.`,
        400
      );
    }

    // Get existing user to check previous balance (for the same wallet-Discord pair)
    const existingUser = existingWalletUser;
    
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
          encryptedAccessToken, // Store encrypted token
          encryptedRefreshToken, // Store encrypted token
          osmoBalance, // Initialize or preserve OSMO balance
          currentRole: roleInfo.currentRole, // Set calculated role based on current balance
          eligibleRoles: roleInfo.eligibleRoles,
          lastRoleUpdate: new Date()
        },
      },
      { upsert: true }
    );

    // If balance is 0 and user previously had a balance, trigger role removal
    if (osmoBalance === 0 && existingUser && existingUser.osmoBalance > 0) {
      try {
        // Call Discord bot API to remove all token-based roles
        const discordBotUrl = process.env.DISCORD_BOT_URL || 'http://localhost:8000';
        const response = await fetch(`${discordBotUrl}/assign-permanent-roles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            discord_id: discordUser.id,
            role_ids: [] // Empty array means remove all token-based roles
          }),
        });

        if (response.ok) {
          console.log(`Successfully removed roles for user ${discordUser.username} (balance: ${osmoBalance})`);
        } else {
          console.error(`Failed to remove roles for user ${discordUser.username}:`, await response.text());
        }
      } catch (error) {
        console.error('Error calling Discord bot for role removal:', error);
      }
    }

    // Check if user is already a member of the Discord server
    let isGuildMember = false;
    if (process.env.DISCORD_GUILD_ID) {
      try {
        const memberCheckResponse = await fetch(`${discordApiUrl}/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordUser.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          },
        });
        
        if (memberCheckResponse.ok) {
          isGuildMember = true;
          console.log(`User ${discordUser.username} is a member of the Discord server`);
        } else if (memberCheckResponse.status === 404) {
          console.log(`User ${discordUser.username} is not a member of the Discord server`);
        } else {
          console.error('Error checking guild membership:', memberCheckResponse.status);
        }
      } catch (error) {
        console.error('Failed to check guild membership:', error);
      }
    }

    // If user is not a guild member, return error
    if (!isGuildMember) {
      return createSecureErrorResponse('You must join the Discord server first before connecting your wallet.', 400);
    }

    // Automatically assign Discord roles if user has eligible roles
    if (roleInfo.eligibleRoles.length > 0) {
      try {
        // Get all roles from database to match with Discord role IDs
        const rolesCollection = db.collection('roles');
        const allRoles = await rolesCollection.find({}).toArray();
        
        // Find Discord role IDs for eligible roles
        const eligibleDiscordRoles = [];
        for (const eligibleRoleName of roleInfo.eligibleRoles) {
          const dbRole = allRoles.find(role => 
            role.name.toLowerCase() === eligibleRoleName.toLowerCase()
          );
          if (dbRole && dbRole.discordRoleId) {
            eligibleDiscordRoles.push(dbRole.discordRoleId);
          }
        }

        // Call Discord bot API to assign roles
        if (eligibleDiscordRoles.length > 0) {
          // Wait a moment for the user to be properly added to the server
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const roleAssignmentUrl = process.env.ROLE_ASSIGNMENT_API_URL || 'http://localhost:8001';
      const roleAssignmentResponse = await fetch(`${roleAssignmentUrl}/assign-permanent-roles`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': process.env.DISCORD_BOT_API_KEY || '',
            },
            body: JSON.stringify({
              discord_id: discordUser.id,
              wallet_address: walletAddress,
              osmo_balance: osmoBalance,
              role_ids: eligibleDiscordRoles
            }),
          });

          if (roleAssignmentResponse.ok) {
            const assignmentResult = await roleAssignmentResponse.json();
            console.log('Roles automatically assigned after OAuth:', assignmentResult);
            
            // Update user with assigned Discord roles
            await db.collection('users').updateOne(
              { walletAddress },
              {
                $set: {
                  assignedDiscordRoles: eligibleDiscordRoles,
                  lastRoleAssignment: new Date()
                }
              }
            );
          } else {
            const errorText = await roleAssignmentResponse.text();
            console.error('Failed to assign roles automatically:', roleAssignmentResponse.status, errorText);
          }
        }
      } catch (error) {
        console.error('Error during automatic role assignment:', error);
        // Don't fail the OAuth process if role assignment fails
      }
    }

    // Create secure user session after successful OAuth
    const { response } = await createUserSession(walletAddress, discordUser.id);
    
    // Redirect back to home page with success alert
    const redirectUrl = new URL('/', baseUrl);
    redirectUrl.searchParams.set('alert', 'success');
    redirectUrl.searchParams.set('username', discordUser.username);
    redirectUrl.searchParams.set('wallet', walletAddress);
    if (roleInfo.eligibleRoles.length > 0) {
      redirectUrl.searchParams.set('roles', roleInfo.eligibleRoles.join(','));
    }
    
    // Create redirect response with secure session cookie
    const redirectResponse = NextResponse.redirect(redirectUrl);
    
    // Copy the secure cookie from the session response to the redirect response
    const sessionCookie = response.cookies.get('session-token');
    if (sessionCookie) {
      redirectResponse.cookies.set(sessionCookie);
    }
    
    return redirectResponse;
    
  } catch (error) {
    console.error('Discord OAuth error:', error);
    const errorUrl = new URL('/', baseUrl);
    errorUrl.searchParams.set('alert', 'failed');
    errorUrl.searchParams.set('message', 'Failed to connect Discord account. Please try again.');
    return NextResponse.redirect(errorUrl);
  }
}

// Apply rate limiting to the GET endpoint
export const GET = withRateLimit(discordCallbackHandler, 'auth');