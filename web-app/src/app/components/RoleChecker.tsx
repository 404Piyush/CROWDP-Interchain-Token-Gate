import React, { useState, useEffect, useCallback } from 'react';

interface Role {
  name: string;
  threshold: number;
  description: string;
  color: string;
}

interface RoleCheckerProps {
  userAddress: string;
  balance: number;
}

interface UserRoleInfo {
  currentRole: string | null;
  eligibleRoles: string[];
  nextRole: Role | null;
  progressToNext: number;
}

const RoleChecker: React.FC<RoleCheckerProps> = ({ userAddress, balance }) => {
  const [roleInfo, setRoleInfo] = useState<UserRoleInfo | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState<string | null>(null);

  const fetchRoleInfo = useCallback(async () => {
    try {
      const response = await fetch(`/api/user/role?action=check&walletAddress=${userAddress}&osmoBalance=${balance}`);
      const data = await response.json();
      
      if (data.success) {
        setRoleInfo({
          currentRole: data.user.currentRole,
          eligibleRoles: data.user.eligibleRoles,
          nextRole: data.user.nextRole,
          progressToNext: data.user.progressToNext
        });
      } else {
        console.error('Failed to fetch role info:', data.message);
      }
    } catch (error) {
      console.error('Error fetching role info:', error);
    }
  }, [userAddress, balance]);

  useEffect(() => {
    fetchRoleInfo();
  }, [fetchRoleInfo]);

  const assignRoles = async () => {
    setAssigning(true);
    setAssignmentResult(null);
    
    try {
      const response = await fetch('/api/user/assign-roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: userAddress,
          osmoBalance: balance
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setAssignmentResult(`✅ Successfully assigned ${data.assignedRoles.length} role(s): ${data.assignedRoles.join(', ')}`);
        // Refresh role info
        await fetchRoleInfo();
      } else {
        setAssignmentResult(`❌ ${data.error || 'Failed to assign roles'}`);
      }
    } catch (error) {
      console.error('Error assigning roles:', error);
      setAssignmentResult('❌ Error occurred while assigning roles');
    } finally {
      setAssigning(false);
    }
  };

  if (!roleInfo) {
    return (
      <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 border border-white/30">
        <div className="animate-pulse">
          <div className="h-4 bg-white/30 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-white/30 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Role Status */}
      <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 border border-white/30">
        <h3 className="text-xl font-bold text-white mb-4 font-druk">Your Role Status</h3>
        
        {roleInfo.currentRole ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="text-lg font-semibold text-white font-arkitech">
                Current Role: {roleInfo.currentRole}
              </span>
            </div>
            <p className="text-white/80 font-arkitech">
              You qualify for {roleInfo.eligibleRoles.length} role(s) with your current balance of {balance} OSMO
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="text-lg font-semibold text-white/70 font-arkitech">
                No Role Assigned
              </span>
            </div>
            <p className="text-white/80 font-arkitech">
              You need OSMO tokens to qualify for roles
            </p>
          </div>
        )}
      </div>

      {/* Role Assignment Button */}
      {roleInfo.eligibleRoles.length > 0 && (
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 border border-white/30">
          <h3 className="text-lg font-bold text-white mb-4 font-druk">Discord Role Assignment</h3>
          
          <div className="space-y-4">
            <p className="text-white/80 font-arkitech">
              Click below to assign your Discord roles based on your current token balance:
            </p>
            
            <button
              onClick={assignRoles}
              disabled={assigning}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg shadow-green-500/25 font-arkitech disabled:cursor-not-allowed disabled:transform-none"
            >
              {assigning ? 'Assigning Roles...' : 'Assign Discord Roles'}
            </button>
            
            {assignmentResult && (
              <div className="p-3 bg-black/30 rounded-lg">
                <p className="text-white font-arkitech text-sm">{assignmentResult}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Next Role Goal */}
      {roleInfo.nextRole && (
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 border border-white/30">
          <h3 className="text-lg font-bold text-white mb-4 font-druk">Next Role Goal</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white font-arkitech">{roleInfo.nextRole.name}</span>
              <span className="text-white/70 font-arkitech">{roleInfo.nextRole.threshold} OSMO</span>
            </div>
            
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${roleInfo.progressToNext}%` }}
              ></div>
            </div>
            
            <p className="text-sm text-white/70 font-arkitech">
              {roleInfo.progressToNext}% progress • Need {roleInfo.nextRole.threshold - balance} more OSMO
            </p>
          </div>
        </div>
      )}

      {/* How Roles Work */}
      <div className="bg-white/10 rounded-xl p-4">
        <h3 className="text-lg font-bold text-black mb-3 font-druk">How Roles Work</h3>
        <div className="space-y-1 text-sm text-black/80 font-arkitech">
          <p>• Roles are automatically assigned based on your OSMO token balance</p>
          <p>• Some roles are for all token holders, others require minimum amounts</p>
          <p>• Use Discord commands to check your status and role goals</p>
          <p>• Click &quot;Assign Discord Roles&quot; to update your roles in Discord</p>
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
};

export default RoleChecker;