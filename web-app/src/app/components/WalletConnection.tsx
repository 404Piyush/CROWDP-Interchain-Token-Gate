'use client';

import { useState } from 'react';
import { ChainInfo } from '@keplr-wallet/types';
import RoleChecker from './RoleChecker';

// Extend Window interface to include Keplr
declare global {
  interface Window {
    keplr?: KeplrWallet;
  }
}

interface KeplrWallet {
  enable: (chainId: string) => Promise<void>;
  getOfflineSigner: (chainId: string) => OfflineSigner;
  getKey: (chainId: string) => Promise<{ bech32Address: string; name: string }>;
  experimentalSuggestChain: (chainInfo: ChainInfo) => Promise<void>;
}

interface OfflineSigner {
  getAccounts: () => Promise<{ address: string }[]>;
}

interface WalletConnectionProps {
  onWalletConnect: (address: string) => void;
}

// Osmosis testnet configuration
const osmosisChain: ChainInfo = {
  chainId: 'osmo-test-5',
  chainName: 'Osmosis Testnet',
  rpc: 'https://rpc.testnet.osmosis.zone',
  rest: 'https://lcd.testnet.osmosis.zone',
  bip44: {
    coinType: 118,
  },
  bech32Config: {
    bech32PrefixAccAddr: 'osmo',
    bech32PrefixAccPub: 'osmopub',
    bech32PrefixValAddr: 'osmovaloper',
    bech32PrefixValPub: 'osmovaloperpub',
    bech32PrefixConsAddr: 'osmovalcons',
    bech32PrefixConsPub: 'osmovalconspub',
  },
  currencies: [
    {
      coinDenom: 'OSMO',
      coinMinimalDenom: 'uosmo',
      coinDecimals: 6,
    },
  ],
  feeCurrencies: [
    {
      coinDenom: 'OSMO',
      coinMinimalDenom: 'uosmo',
      coinDecimals: 6,
    },
  ],
  stakeCurrency: {
    coinDenom: 'OSMO',
    coinMinimalDenom: 'uosmo',
    coinDecimals: 6,
  },
};

export default function WalletConnection({ onWalletConnect }: WalletConnectionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string>('');
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentView, setCurrentView] = useState<'profile' | 'roles'>('profile');

  const connectWallet = async () => {
    if (!window.keplr) {
      setError('Please install Keplr extension');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await window.keplr.experimentalSuggestChain(osmosisChain);
      await window.keplr.enable('osmo-test-5');
      
      const offlineSigner = window.keplr.getOfflineSigner(osmosisChain.chainId);
      const accounts = await offlineSigner.getAccounts();
      
      if (accounts.length > 0) {
        const userAddress = accounts[0].address;
        setAddress(userAddress);
        setIsConnected(true);
        onWalletConnect(userAddress);
        
        // Fetch balance
        await fetchBalance(userAddress);
      }
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      setError('Failed to connect wallet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBalance = async (userAddress: string) => {
    try {
      const response = await fetch(`${osmosisChain.rest}/cosmos/bank/v1beta1/balances/${userAddress}`);
      const data = await response.json();
      
      interface Balance {
        denom: string;
        amount: string;
      }
      
      const osmoBalance = data.balances?.find((b: Balance) => b.denom === 'uosmo');
      if (osmoBalance) {
        const formattedBalance = (parseInt(osmoBalance.amount) / 1000000).toFixed(6);
        setBalance(formattedBalance);
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setAddress('');
    setBalance('0');
    setError('');
    setCurrentView('profile');
  };

  if (!isConnected) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20 max-w-md mx-auto">
        {/* Centered Logo */}
        <div className="text-center mb-8">
          <img 
            src="/imgs/logo.png" 
            alt="Logo" 
            className="w-20 h-20 mx-auto object-contain"
          />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 font-druk">
            Connect Your Wallet
          </h1>
          <p className="text-white/80 text-lg leading-relaxed font-arkitech">
            Connect your Keplr wallet to access the Crowdpunk ecosystem
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <button
          onClick={connectWallet}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 text-lg shadow-lg shadow-teal-500/25 disabled:shadow-none font-arkitech"
        >
          {isLoading ? 'Connecting...' : 'Connect Keplr Wallet'}
        </button>

        <div className="mt-6 text-center">
          <p className="text-sm text-black/60 font-arkitech">
            Don&apos;t have Keplr?{' '}
            <a 
              href="https://www.keplr.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-teal-600 hover:text-teal-700 underline font-arkitech"
            >
              Download here
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-teal-500/20 to-cyan-500/20 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
      {/* Disconnect Icon */}
      <button
        onClick={disconnectWallet}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-red-500/20 rounded-lg transition-all duration-200"
        title="Disconnect Wallet"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {/* Header with Logo and Navigation */}
      <div className="flex items-center justify-between mb-8">
        <img 
          src="/imgs/logo.png" 
          alt="Logo" 
          className="w-12 h-12 object-contain"
        />
        
        <div className="flex space-x-3">
          <button
            onClick={() => setCurrentView('profile')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 font-arkitech ${
              currentView === 'profile' 
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25' 
                : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/20'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setCurrentView('roles')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 font-arkitech ${
              currentView === 'roles' 
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25' 
                : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/20'
            }`}
          >
            Roles
          </button>
        </div>
      </div>

      {currentView === 'profile' ? (
        <div>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2 font-druk">
              Wallet Connected
            </h2>
            <p className="text-white/80 text-lg font-arkitech">Welcome to Crowdpunk!</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wide font-druk">Address</h3>
              <p className="text-white font-mono text-sm break-all bg-black/20 p-3 rounded-lg font-arkitech">{address}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wide font-druk">OSMO Balance</h3>
              <p className="text-white text-2xl font-bold font-arkitech">{balance} <span className="text-lg text-white/70 font-arkitech">OSMO</span></p>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => window.open(`/api/auth/discord?wallet=${address}`, '_blank')}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg shadow-indigo-500/25 font-arkitech"
            >
              Connect Discord Account
            </button>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <h3 className="text-lg font-bold text-white mb-4 font-druk">Discord Commands</h3>
            <div className="space-y-3 text-sm text-white/80">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                <code className="bg-black/30 px-3 py-2 rounded-lg font-mono text-teal-300 font-arkitech">/rolegoals</code>
                <span className="font-arkitech">- View all role requirements</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <RoleChecker userAddress={address} balance={parseFloat(balance)} />
      )}
    </div>
  );
}