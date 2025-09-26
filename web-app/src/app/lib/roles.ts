// Role system configuration and utilities
export interface Role {
  name: string;
  threshold: number; // OSMO token threshold
  description: string;
  color: string; // Hex color for UI display
}

export const ROLES: Role[] = [
  {
    name: 'trader',
    threshold: 1,
    description: 'Entry level trader with 1+ OSMO tokens',
    color: '#10B981' // emerald-500
  },
  {
    name: 'OG Crowd',
    threshold: 5,
    description: 'Experienced community member with 5+ OSMO tokens',
    color: '#F59E0B' // amber-500
  },
  {
    name: 'the strongest',
    threshold: 10,
    description: 'Elite member with 10+ OSMO tokens',
    color: '#EF4444' // red-500
  }
];

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
export function calculateUserRole(osmoBalance: number): {
  currentRole: string | null;
  eligibleRoles: string[];
  nextRole: Role | null;
  progressToNext: number;
} {
  // Sort roles by threshold (ascending)
  const sortedRoles = [...ROLES].sort((a, b) => a.threshold - b.threshold);
  
  // Find eligible roles (balance meets threshold)
  const eligibleRoles = sortedRoles
    .filter(role => osmoBalance >= role.threshold)
    .map(role => role.name);
  
  // Current role is the highest eligible role
  const currentRole = eligibleRoles.length > 0 ? eligibleRoles[eligibleRoles.length - 1] : null;
  
  // Find next role to achieve
  const nextRole = sortedRoles.find(role => osmoBalance < role.threshold) || null;
  
  // Calculate progress to next role (0-100%)
  let progressToNext = 0;
  if (nextRole) {
    const previousThreshold = currentRole 
      ? sortedRoles.find(r => r.name === currentRole)?.threshold || 0
      : 0;
    progressToNext = Math.min(100, 
      ((osmoBalance - previousThreshold) / (nextRole.threshold - previousThreshold)) * 100
    );
  } else if (currentRole) {
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
export function getRoleByName(roleName: string): Role | undefined {
  return ROLES.find(role => role.name === roleName);
}

/**
 * Get all role goals for display
 */
export function getAllRoleGoals(): Role[] {
  return [...ROLES].sort((a, b) => a.threshold - b.threshold);
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