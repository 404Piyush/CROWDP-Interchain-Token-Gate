'use client';

import { useState, useEffect } from 'react';
import WalletConnection from './components/WalletConnection';
import Navbar from './components/Navbar';
import AlertModal from './components/AlertModal';

export default function Home() {
  // Alert modal state for Discord OAuth callbacks
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error',
    title: '',
    message: '',
    details: null as { discordUsername?: string; walletAddress?: string; assignedRoles?: string[] } | null
  });

  // Handle Discord OAuth callback at page level
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const alertType = urlParams.get('alert');
    
    if (alertType === 'success') {
      const username = urlParams.get('username');
      const wallet = urlParams.get('wallet');
      const roles = urlParams.get('roles');
      
      let message = `🎉 Discord account successfully connected!`;
      if (username) {
        message += `\n👤 Username: ${username}`;
      }
      if (wallet) {
        message += `\n💼 Wallet: ${wallet.slice(0, 8)}...${wallet.slice(-6)}`;
      }
      if (roles) {
        const roleList = roles.split(',').join(', ');
        message += `\n🏆 Roles assigned: ${roleList}`;
      }
      
      setAlertModal({
        isOpen: true,
        type: 'success',
        title: '✅ Connection Successful!',
        message,
        details: {
          discordUsername: username || '',
          walletAddress: wallet || '',
          assignedRoles: roles ? roles.split(',') : []
        }
      });
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (alertType === 'failed') {
      const message = urlParams.get('message') || 'Failed to connect Discord account. Please try again.';
      
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: '❌ Connection Failed',
        message: `⚠️ ${message}`,
        details: null
      });
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleWalletConnect = (address: string) => {
    console.log('Wallet connected:', address);
  };

  const closeAlertModal = () => {
    setAlertModal(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/imgs/secondary-bg.png')"
        }}
      />
      <div className="absolute inset-0 bg-black/20" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        
        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-7xl">
            <WalletConnection
              onWalletConnect={handleWalletConnect}
            />
          </div>
        </main>
      </div>

      {/* Full-page Discord OAuth Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        details={alertModal.details}
        onClose={closeAlertModal}
      />
    </div>
  );
}
