'use client';

import WalletConnection from './components/WalletConnection';
import Navbar from './components/Navbar';

export default function Home() {
  const handleWalletConnect = (address: string) => {
    console.log('Wallet connected:', address);
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
          <div className="w-full max-w-4xl">
            <WalletConnection
              onWalletConnect={handleWalletConnect}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
