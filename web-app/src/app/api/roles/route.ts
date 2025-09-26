import { NextRequest, NextResponse } from 'next/server';
import { RoleDatabase } from '../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');
    const balance = searchParams.get('balance');

    // If no parameters provided, return all roles for goals display
    if (!wallet && !balance) {
      const allRoles = await RoleDatabase.getAllRoles();
      return NextResponse.json({
        roles: allRoles.map(role => ({
          name: role.name,
          type: role.type,
          threshold: role.amountThreshold || 0,
          description: role.type === 'amount' 
            ? `${role.amountThreshold} OSMO` 
            : 'Entry level trader with 1+ OSMO tokens'
        }))
      });
    }

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!balance) {
      return NextResponse.json(
        { error: 'Balance is required' },
        { status: 400 }
      );
    }

    const balanceNumber = parseFloat(balance);
    if (isNaN(balanceNumber)) {
      return NextResponse.json(
        { error: 'Invalid balance format' },
        { status: 400 }
      );
    }

    // Get roles that the user qualifies for based on their balance
    const qualifiedRoles = await RoleDatabase.getRoleForBalance(balanceNumber);

    // Calculate user role based on qualified roles
    let userRole = 'No Role';
    let roleGoals: string[] = [];

    if (qualifiedRoles.length > 0) {
      // Find the highest threshold role they qualify for
      const amountRoles = qualifiedRoles.filter(role => role.type === 'amount');
      const holderRoles = qualifiedRoles.filter(role => role.type === 'holder');

      if (amountRoles.length > 0) {
        // Get the role with the highest threshold they qualify for
        const highestRole = amountRoles.reduce((prev, current) => 
          (current.amountThreshold || 0) > (prev.amountThreshold || 0) ? current : prev
        );
        userRole = highestRole.name;
      } else if (holderRoles.length > 0) {
        // If they only qualify for holder roles, use the first one
        userRole = holderRoles[0].name;
      }
    }

    // Get all roles to show goals
    const allRoles = await RoleDatabase.getAllRoles();
    roleGoals = allRoles
      .filter(role => role.type === 'amount' && (role.amountThreshold || 0) > balanceNumber)
      .sort((a, b) => (a.amountThreshold || 0) - (b.amountThreshold || 0))
      .map(role => `${role.name}: ${role.amountThreshold} OSMO`);

    return NextResponse.json({
      user: userRole,
      goals: roleGoals,
      qualifiedRoles: qualifiedRoles.map(role => ({
        name: role.name,
        type: role.type,
        threshold: role.amountThreshold
      }))
    });

  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, discordRoleId, amountThreshold, type } = await request.json();

    if (!name || !discordRoleId || !type) {
      return NextResponse.json(
        { error: 'Name, discordRoleId, and type are required' },
        { status: 400 }
      );
    }

    if (type !== 'holder' && type !== 'amount') {
      return NextResponse.json(
        { error: 'Type must be either "holder" or "amount"' },
        { status: 400 }
      );
    }

    if (type === 'amount' && (!amountThreshold || amountThreshold <= 0)) {
      return NextResponse.json(
        { error: 'Amount threshold is required for amount-based roles and must be greater than 0' },
        { status: 400 }
      );
    }

    const roleData = {
      name,
      discordRoleId,
      type: type as 'holder' | 'amount',
      ...(type === 'amount' && { amountThreshold })
    };

    const newRole = await RoleDatabase.addRole(roleData);

    return NextResponse.json({
      success: true,
      role: newRole
    });

  } catch (error) {
    console.error('Error adding role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}