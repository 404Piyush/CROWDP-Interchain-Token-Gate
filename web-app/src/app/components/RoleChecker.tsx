'use client';

import { useState, useEffect } from 'react';

interface Role {
  name: string;
  threshold?: number;
  type: 'holder' | 'amount';
}

interface RoleCheckerProps {
  userAddress: string;
  balance: number;
}

export default function RoleChecker({ userAddress, balance }: RoleCheckerProps) {
  const [userRole, setUserRole] = useState<string>('No Role');
  const [roleGoals, setRoleGoals] = useState<string[]>([]);
  const [qualifiedRoles, setQualifiedRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!userAddress || balance === undefined) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const response = await fetch(`/api/roles?wallet=${userAddress}&balance=${balance}`);
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.user);
          setRoleGoals(data.goals || []);
          setQualifiedRoles(data.qualifiedRoles || []);
        } else {
          setError('Failed to fetch user role');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setError('Error fetching user role');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [userAddress, balance]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
        <p className="text-black/70 font-arkitech">Loading role information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-black mb-2 font-druk">
          Role System
        </h2>
        <p className="text-black/80">Your status in the Crowdpunk ecosystem</p>
      </div>

      {/* Current Status */}
      <div className="bg-white/20 rounded-xl p-6">
        <h3 className="text-lg font-bold text-black mb-4 font-druk">Current Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white/10 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-black/70 mb-1 font-druk">Balance</h4>
            <p className="text-xl font-bold text-black">
              {balance.toFixed(6)} OSMO
            </p>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-black/70 mb-1 font-druk">Current Role</h4>
            <p className="text-xl font-bold text-black">
              {userRole}
            </p>
          </div>
        </div>

        {/* Qualified Roles */}
        {qualifiedRoles.length > 0 && (
          <div className="bg-white/10 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-black/70 mb-2 font-druk">
              Your Qualified Roles
            </h4>
            <div className="space-y-2">
              {qualifiedRoles.map((role, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-black font-medium">{role.name}</span>
                  <span className="text-black/70 text-sm">
                    {role.type === 'holder' ? 'All Holders' : `${role.threshold} OSMO`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Role Goals */}
      {roleGoals.length > 0 && (
        <div className="bg-white/20 rounded-xl p-6">
          <h3 className="text-lg font-bold text-black mb-4 font-druk">Next Role Goals</h3>
          
          <div className="space-y-3">
            {roleGoals.map((goal, index) => (
              <div key={index} className="p-4 rounded-lg bg-white/10 border border-white/20">
                <p className="text-black font-medium">{goal}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-white/10 rounded-xl p-4">
        <h3 className="text-lg font-bold text-black mb-3 font-druk">How It Works</h3>
        <div className="space-y-2 text-sm text-black/80">
          <p>• Roles are automatically assigned based on your OSMO token balance</p>
          <p>• Some roles are for all token holders, others require minimum amounts</p>
          <p>• Use Discord commands to check your status and role goals</p>
          <p>• Roles are updated when your balance changes</p>
        </div>
      </div>

      {/* Discord Commands */}
      <div className="bg-white/10 rounded-xl p-4">
        <h3 className="text-lg font-bold text-black mb-3 font-druk">Discord Commands</h3>
        <div className="space-y-2 text-sm text-black/80">
          <p><code className="bg-black/20 px-2 py-1 rounded">/rolegoals</code> - Check your role progress and goals</p>
          <p><code className="bg-black/20 px-2 py-1 rounded">/addreward</code> - Add new roles (Admin only)</p>
        </div>
      </div>
    </div>
  );
}