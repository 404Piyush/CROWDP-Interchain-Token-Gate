// Role system configuration and utilities
import { connectToDatabase } from './mongodb';

export interface Role {
  name: string;
  threshold: number; // OSMO token threshold
  description: string;
  color: string; // Hex color for UI display
  type: 'amount' | 'holder';
  discordRoleId?: string;
}

// Cache for roles to avoid frequent database calls
let rolesCache: Role[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all roles from database with caching
 */
async function getRolesFromDatabase(): Promise<Role[]> {
  const now = Date.now();
  
  // Return cached roles if still valid
  if (rolesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return rolesCache;
  }

  try {
    const { db } = await connectToDatabase();
    const rolesCollection = db.collection('roles');
    const dbRoles = await rolesCollection.find({}).toArray();
    
    // Convert database roles to our Role interface
    rolesCache = dbRoles.map(role => ({
      name: role.name,
      threshold: role.type === 'amount' ? role.amountThreshold : 1,
      description: role.description || `${role.name} role`,
      color: role.color || '#10B981', // Default color
      type: role.type,
      discordRoleId: role.discordRoleId
    }));
    
    cacheTimestamp = now;
    return rolesCache;
  } catch (error) {
    console.error('Failed to fetch roles from database:', error);
    // Return empty array if database fails
    return [];
  }
}

/**
 * Clear the roles cache (useful for testing or when roles are updated)
 */
export function clearRolesCache(): void {
  rolesCache = null;
  cacheTimestamp = 0;
}

export interface UserRole {
  userId: string;
  walletAddress: string;
  currentRole: string | null;
  osmoBalance: number;
  lastUpdated: Date;
  eligibleRoles: string[];
}

/**
 * Calculate user's role based on OSMO token balance
 */
export async function calculateUserRole(osmoBalance: number): Promise<{
  currentRole: string | null;
  eligibleRoles: string[];
  nextRole: Role | null;
  progressToNext: number;
}> {
  // Get roles from database
  const allRoles = await getRolesFromDatabase();
  
  // Separate holder roles and amount roles
  const holderRoles = allRoles.filter(role => role.type === 'holder');
  const amountRoles = allRoles.filter(role => role.type === 'amount');
  
  // Sort amount roles by threshold (ascending)
  const sortedAmountRoles = [...amountRoles].sort((a, b) => a.threshold - b.threshold);
  
  // Find eligible roles
  const eligibleRoles: string[] = [];
  
  // Add holder roles only if user has any OSMO tokens (balance > 0)
  if (osmoBalance > 0) {
    holderRoles.forEach(role => {
      eligibleRoles.push(role.name);
    });
  }
  
  // Find the highest amount role they qualify for (not all of them)
  let highestAmountRole: Role | null = null;
  for (let i = sortedAmountRoles.length - 1; i >= 0; i--) {
    const role = sortedAmountRoles[i];
    if (osmoBalance >= role.threshold) {
      highestAmountRole = role;
      eligibleRoles.push(role.name);
      break; // Only add the highest qualifying role
    }
  }
  
  // Current role is the highest amount role they qualify for (or first holder role if no amount roles and balance > 0)
  const currentRole = highestAmountRole ? highestAmountRole.name : 
    (holderRoles.length > 0 && osmoBalance > 0 ? holderRoles[0].name : null);
  
  // Find next role to achieve (next higher amount role)
  const nextRole = sortedAmountRoles.find(role => osmoBalance < role.threshold) || null;
  
  // Calculate progress to next role (0-100%)
  let progressToNext = 0;
  if (nextRole) {
    const previousThreshold = highestAmountRole ? highestAmountRole.threshold : 0;
    progressToNext = Math.min(100, 
      ((osmoBalance - previousThreshold) / (nextRole.threshold - previousThreshold)) * 100
    );
  } else if (highestAmountRole) {
    progressToNext = 100; // Already at highest role
  }
  
  return {
    currentRole,
    eligibleRoles,
    nextRole,
    progressToNext: Math.round(progressToNext)
  };
}

/**
 * Get role by name
 */
export async function getRoleByName(roleName: string): Promise<Role | undefined> {
  const allRoles = await getRolesFromDatabase();
  return allRoles.find(role => role.name === roleName);
}

/**
 * Get all role goals for display
 */
export async function getAllRoleGoals(): Promise<Role[]> {
  const allRoles = await getRolesFromDatabase();
  return [...allRoles].sort((a, b) => a.threshold - b.threshold);
}

/**
 * Format OSMO balance for display
 */
export function formatOsmoBalance(balance: number): string {
  if (balance >= 1000000) {
    return `${(balance / 1000000).toFixed(2)}M`;
  } else if (balance >= 1000) {
    return `${(balance / 1000).toFixed(2)}K`;
  } else {
    return balance.toFixed(2);
  }
}