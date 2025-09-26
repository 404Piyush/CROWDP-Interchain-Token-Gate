import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import { calculateUserRole, getAllRoleGoals, UserRole } from '../../../lib/roles';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    const discordId = searchParams.get('discord');
    const action = searchParams.get('action') || 'check';

    // Handle different actions
    switch (action) {
      case 'goals':
        // Return all role goals
        return NextResponse.json({
          success: true,
          roles: getAllRoleGoals()
        });

      case 'check':
        // Check specific user's role
        if (!walletAddress && !discordId) {
          return NextResponse.json(
            { error: 'Either wallet address or Discord ID is required' },
            { status: 400 }
          );
        }

        const { db } = await connectToDatabase();
        
        // Find user by wallet address or Discord ID
        const query = walletAddress 
          ? { walletAddress }
          : { discordId };
        
        const user = await db.collection('users').findOne(query);
        
        if (!user) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }

        // Get current OSMO balance (this would typically come from blockchain query)
        // For now, we'll use stored balance or default to 0
        const osmoBalance = user.osmoBalance || 0;
        
        // Calculate role information
        const roleInfo = calculateUserRole(osmoBalance);
        
        // Update user's role information in database
        await db.collection('users').updateOne(
          { _id: user._id },
          {
            $set: {
              currentRole: roleInfo.currentRole,
              osmoBalance,
              eligibleRoles: roleInfo.eligibleRoles,
              lastRoleUpdate: new Date()
            }
          }
        );

        const userRole: UserRole = {
          userId: user._id.toString(),
          walletAddress: user.walletAddress,
          currentRole: roleInfo.currentRole,
          osmoBalance,
          lastUpdated: new Date(),
          eligibleRoles: roleInfo.eligibleRoles
        };

        return NextResponse.json({
          success: true,
          user: {
            walletAddress: user.walletAddress,
            discordId: user.discordId,
            discordUsername: user.discordUsername,
            osmoBalance,
            ...roleInfo
          }
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "check" or "goals"' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in role API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, discordId, osmoBalance } = await request.json();
    
    if (!walletAddress && !discordId) {
      return NextResponse.json(
        { error: 'Either wallet address or Discord ID is required' },
        { status: 400 }
      );
    }

    if (typeof osmoBalance !== 'number' || osmoBalance < 0) {
      return NextResponse.json(
        { error: 'Valid OSMO balance is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Find user
    const query = walletAddress 
      ? { walletAddress }
      : { discordId };
    
    const user = await db.collection('users').findOne(query);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate new role information
    const roleInfo = calculateUserRole(osmoBalance);
    
    // Update user's role and balance
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          osmoBalance,
          currentRole: roleInfo.currentRole,
          eligibleRoles: roleInfo.eligibleRoles,
          lastRoleUpdate: new Date()
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Role updated successfully',
      user: {
        walletAddress: user.walletAddress,
        discordId: user.discordId,
        discordUsername: user.discordUsername,
        osmoBalance,
        ...roleInfo
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}